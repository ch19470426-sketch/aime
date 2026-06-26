// src/types/vistoria-types.ts
// AIMÊ — Tipos compartilhados entre API routes e hooks
// Separado para evitar importação circular entre Server e Client Components

export interface GerarNcCpRequest {
  sistema:      string
  subsistema:   string
  anomalia:     string
  local:        string
  complemento?: string
  origem:       string
  abrangencia:  string
}

export interface GerarNcCpResponse {
  nc:    string
  cp:    string
  erro?: string
}
