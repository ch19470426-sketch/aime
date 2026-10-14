#!/bin/bash
# Testes das funções saldo_creditos e consumir_creditos (migração 2026-10-14). Roda contra um PostgreSQL de teste com a estrutura das tabelas.
# Uso: PGHOST=/tmp/pgsock PGPORT=5439 PGUSER=postgres PGDATABASE=aime_teste ./2026-10-14_saldo_soma_planos.sh
# Antes: carregar o esquema das tabelas e a migração (ou as funções antigas, para provar que o teste enxerga o defeito).
Q() { psql -v ON_ERROR_STOP=1 -q -t -A -c "$1"; }
FALHAS=0; TOTAL=0
confere() { TOTAL=$((TOTAL+1)); if [ "$2" == "$3" ]; then echo "  ok   $1"; else echo "  FALHA $1: esperado [$2] obtido [$3]"; FALHAS=$((FALHAS+1)); fi; }
J() { Q "SELECT ($1)::jsonb ->> '$2'"; }
limpa() { Q "TRUNCATE inspetor, contratos_inspetor, consumo_creditos RESTART IDENTITY" > /dev/null; Q "INSERT INTO inspetor VALUES ('111', false), ('222', true)" > /dev/null; }
contrato() { Q "INSERT INTO contratos_inspetor (cpf_inspetor, tipo_assinatura, data_inicio_contrato, qde_contratada_plano, saldo_quantidade_plano, saldo_quantidade_avulso, data_fim_avulso) VALUES ('${1}', '${2}', current_date + (${3}), 600, ${4}, ${5:-0}, ${6:-NULL})" > /dev/null; }
saldos() { Q "SELECT string_agg(tipo_assinatura || ':' || saldo_quantidade_plano || '/' || saldo_quantidade_avulso, ' ' ORDER BY data_inicio_contrato, tipo_assinatura) FROM contratos_inspetor WHERE cpf_inspetor = '$1'"; }

echo "1. o caso do Celso: Cortesia 66 (vence em 10 dias) + Serviço 50 (vence em 60), laudo de 100"
limpa; contrato 111 'PLANO CORTESIA' -5 66; contrato 111 'PLANO SERVIÇO' 0 50
confere "saldo de plano soma os dois" 116 "$(J "saldo_creditos('111')" saldo_plano)"
confere "saldo total" 116 "$(J "saldo_creditos('111')" saldo_total)"
R=$(Q "SELECT consumir_creditos('111', 100, '47', '123', 'r1')")
confere "débito de 100 é aceito" true "$(J "'$R'" ok)"
confere "debitado do plano" 100 "$(J "'$R'" debitado_plano)"
confere "o que vence antes é usado primeiro (Cortesia zera, Serviço fica com 16)" "PLANO CORTESIA:0/0 PLANO SERVIÇO:16/0" "$(saldos 111)"
confere "saldo depois" 16 "$(J "saldo_creditos('111')" saldo_plano)"

echo "2. um plano só: o comportamento de sempre"
limpa; contrato 111 'PLANO SERVIÇO' 0 50
confere "saldo" 50 "$(J "saldo_creditos('111')" saldo_total)"
Q "SELECT consumir_creditos('111', 20, '31', '123', 'r2')" > /dev/null
confere "débito de 20" "PLANO SERVIÇO:30/0" "$(saldos 111)"

echo "3. plano VENCIDO não conta (Cortesia começou há 20 dias, venceu há 5)"
limpa; contrato 111 'PLANO CORTESIA' -20 66; contrato 111 'PLANO SERVIÇO' 0 50
confere "saldo só do vigente" 50 "$(J "saldo_creditos('111')" saldo_plano)"
R=$(Q "SELECT consumir_creditos('111', 60, '47', '123', 'r3')")
confere "débito de 60 recusado" false "$(J "'$R'" ok)"
confere "motivo" saldo_insuficiente "$(J "'$R'" motivo)"
confere "nada foi alterado" "PLANO CORTESIA:66/0 PLANO SERVIÇO:50/0" "$(saldos 111)"

echo "4. mais do que o saldo total: recusa e não altera nada nem grava no livro"
limpa; contrato 111 'PLANO CORTESIA' -5 66; contrato 111 'PLANO SERVIÇO' 0 50
R=$(Q "SELECT consumir_creditos('111', 117, '47', '123', 'r4')")
confere "recusado" false "$(J "'$R'" ok)"
confere "saldo informado na recusa" 116 "$(J "'$R'" saldo_plano)"
confere "contratos intactos" "PLANO CORTESIA:66/0 PLANO SERVIÇO:50/0" "$(saldos 111)"
confere "livro vazio" 0 "$(Q "SELECT count(*) FROM consumo_creditos")"

echo "5. plano de dois contratos + avulso do mais recente"
limpa; contrato 111 'PLANO CORTESIA' -5 66; contrato 111 'PLANO SERVIÇO' 0 50 30
confere "saldo total 116 + 30" 146 "$(J "saldo_creditos('111')" saldo_total)"
R=$(Q "SELECT consumir_creditos('111', 130, '47', '123', 'r5')")
confere "plano 116 + avulso 14" "116/14" "$(J "'$R'" debitado_plano)/$(J "'$R'" debitado_avulso)"
confere "contratos" "PLANO CORTESIA:0/0 PLANO SERVIÇO:0/16" "$(saldos 111)"

echo "6. avulso VENCIDO não conta"
limpa; contrato 111 'PLANO SERVIÇO' 0 50 30 "current_date - 1"
confere "saldo sem o avulso vencido" 50 "$(J "saldo_creditos('111')" saldo_total)"
R=$(Q "SELECT consumir_creditos('111', 60, '47', '123', 'r6')")
confere "recusado" false "$(J "'$R'" ok)"

echo "7. plano e avulso na MESMA linha (o ctid muda a cada UPDATE: a atualização é pela chave primária)"
limpa; contrato 111 'PLANO CORTESIA' -5 0; contrato 111 'PLANO SERVIÇO' 0 50 30
R=$(Q "SELECT consumir_creditos('111', 70, '47', '123', 'r7')")
confere "plano 50 + avulso 20" "50/20" "$(J "'$R'" debitado_plano)/$(J "'$R'" debitado_avulso)"
confere "linha única atualizada" "PLANO CORTESIA:0/0 PLANO SERVIÇO:0/10" "$(saldos 111)"

echo "8. repetição com a mesma referência não cobra de novo"
limpa; contrato 111 'PLANO SERVIÇO' 0 50
Q "SELECT consumir_creditos('111', 10, '31', '123', 'mesma')" > /dev/null
R=$(Q "SELECT consumir_creditos('111', 10, '31', '123', 'mesma')")
confere "marcado como duplicado" true "$(J "'$R'" duplicado)"
confere "debitou uma vez só" "PLANO SERVIÇO:40/0" "$(saldos 111)"

echo "9. gestor é isento e inspetor inexistente"
limpa; contrato 222 'PLANO SERVIÇO' 0 50
R=$(Q "SELECT consumir_creditos('222', 30, '47', '123', 'r9')")
confere "gestor isento" true "$(J "'$R'" isento)"
confere "gestor sem débito" "PLANO SERVIÇO:50/0" "$(saldos 222)"
R=$(Q "SELECT consumir_creditos('999', 1, '31')"); confere "inspetor inexistente" inspetor_nao_encontrado "$(J "'$R'" motivo)"

echo "10. empate de validade: o contrato mais antigo é usado primeiro"
limpa; contrato 111 'PLANO MENSAL' -20 40; contrato 111 'PLANO CORTESIA' -5 40
Q "SELECT consumir_creditos('111', 50, '47', '123', 'r10')" > /dev/null
confere "Mensal (início mais antigo) zera e o Cortesia fica com 30" "PLANO MENSAL:0/0 PLANO CORTESIA:30/0" "$(saldos 111)"

echo "11. três contratos, débito que atravessa dois"
limpa; contrato 111 'PLANO CORTESIA' -5 10; contrato 111 'PLANO MENSAL' -2 20; contrato 111 'PLANO SERVIÇO' 0 50
Q "SELECT consumir_creditos('111', 25, '47', '123', 'r11')" > /dev/null
confere "Cortesia zera, Mensal zera, Serviço perde 0 (25 = 10 + 15 do Mensal)" "PLANO CORTESIA:0/0 PLANO MENSAL:5/0 PLANO SERVIÇO:50/0" "$(saldos 111)"

echo "12. débitos SIMULTÂNEOS: saldo 100, cinco débitos de 30 ao mesmo tempo"
limpa; contrato 111 'PLANO CORTESIA' -5 40; contrato 111 'PLANO SERVIÇO' 0 60
for i in 1 2 3 4 5; do ( Q "SELECT consumir_creditos('111', 30, '47', '123', 'c$i')" > /tmp/conc_$i.txt ) & done; wait
OK=$(cat /tmp/conc_*.txt | grep -c '"ok": true'); NEG=$(Q "SELECT count(*) FROM contratos_inspetor WHERE saldo_quantidade_plano < 0")
confere "exatamente 3 débitos passaram" 3 "$OK"
confere "saldo restante 10" 10 "$(J "saldo_creditos('111')" saldo_plano)"
confere "nenhum saldo negativo" 0 "$NEG"
confere "o livro soma 90" 90 "$(Q "SELECT sum(custo) FROM consumo_creditos")"

echo; echo "RESULTADO: $((TOTAL-FALHAS)) de $TOTAL conferências passaram, $FALHAS falha(s)"
exit $FALHAS
