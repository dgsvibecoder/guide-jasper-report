#!/bin/bash

# Credenciais do banco
export PGPASSWORD="postgres"

# Criar dados de teste na view/tabela accessops
psql -h 172.30.64.1 -U postgres -d jasper-report-ai << 'EOF'

-- Verificar/criar tabela accessops se não existir
CREATE TABLE IF NOT EXISTS accessops (
  idazienda INT,
  nomeazienda VARCHAR(500),
  idps INT,
  nomeps VARCHAR(500),
  idaccesso INT PRIMARY KEY,
  idpaziente INT,
  datainserimento TIMESTAMP,
  dataaccettazione TIMESTAMP,
  datadimissione TIMESTAMP,
  idcodiceesterno VARCHAR(100),
  ticket VARCHAR(100)
);

-- Verificar se tem dados, senão inserir dados de teste
INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettazione, datadimissione, idcodiceesterno, ticket)
SELECT 1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1001, 5001, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', 'EXT-2026-00001', 'TKT-2026-00001'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1001);

INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettazione, datadimissione, idcodiceesterno, ticket)
SELECT 1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1002, 5002, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '10 minutes', NOW() - INTERVAL '4 days' + INTERVAL '1 hour 30 minutes', 'EXT-2026-00002', 'TKT-2026-00002'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1002);

INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettazione, datadimissione, idcodiceesterno, ticket)
SELECT 1, 'Empresa ABC Saúde', 502, 'PS Vila Mariana', 1003, 5003, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'EXT-2026-00003', 'TKT-2026-00003'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1003);

INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettazione, datadimissione, idcodiceesterno, ticket)
SELECT 2, 'Clinica XYZ', 503, 'PS Zona Leste', 1004, 5004, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '8 minutes', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'EXT-2026-00004', 'TKT-2026-00004'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1004);

INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettazione, datadimissione, idcodiceesterno, ticket)
SELECT 2, 'Clinica XYZ', 502, 'PS Vila Mariana', 1005, 5005, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', NULL, 'EXT-2026-00005', 'TKT-2026-00005'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1005);

INSERT INTO accessops (idazienda, nomeazienda, idps, nomeps, idaccesso, idpaziente, datainserimento, dataaccettacao, datadimissione, idcodiceesterno, ticket)
SELECT 1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1006, 5006, NOW(), NOW() + INTERVAL '1 minute', NULL, 'EXT-2026-00006', 'TKT-2026-00006'
WHERE NOT EXISTS (SELECT 1 FROM accessops WHERE idaccesso = 1006);

-- Listar dados inseridos
SELECT COUNT(*) as total_registros FROM accessops;
SELECT * FROM accessops ORDER BY datainserimento DESC LIMIT 10;

EOF
