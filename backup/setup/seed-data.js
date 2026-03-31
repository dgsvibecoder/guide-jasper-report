#!/usr/bin/env node

const { execSync } = require('child_process');

// SQL para criar e popular tabela accessops
const sql = `
-- Criar tabela se não existir
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

-- Limpar dados antigos
DELETE FROM accessops;

-- Inserir dados de teste
INSERT INTO accessops VALUES 
  (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1001, 5001, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', 'EXT-2026-00001', 'TKT-2026-00001'),
  (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1002, 5002, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '10 minutes', NOW() - INTERVAL '4 days' + INTERVAL '1 hour 30 minutes', 'EXT-2026-00002', 'TKT-2026-00002'),
  (1, 'Empresa ABC Saúde', 502, 'PS Vila Mariana', 1003, 5003, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'EXT-2026-00003', 'TKT-2026-00003'),
  (2, 'Clinica XYZ', 503, 'PS Zona Leste', 1004, 5004, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '8 minutes', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'EXT-2026-00004', 'TKT-2026-00004'),
  (2, 'Clinica XYZ', 502, 'PS Vila Mariana', 1005, 5005, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', NULL, 'EXT-2026-00005', 'TKT-2026-00005'),
  (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1006, 5006, NOW(), NOW() + INTERVAL '1 minute', NULL, 'EXT-2026-00006', 'TKT-2026-00006'),
  (2, 'Clinica XYZ', 503, 'PS Zona Leste', 1007, 5007, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '7 minutes', NOW() - INTERVAL '6 days' + INTERVAL '4 hours', 'EXT-2026-00007', 'TKT-2026-00007'),
  (1, 'Empresa ABC Saúde', 502, 'PS Vila Mariana', 1008, 5008, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '15 minutes', NOW() - INTERVAL '8 days' + INTERVAL '2 hours 30 minutes', 'EXT-2026-00008', 'TKT-2026-00008');

SELECT COUNT(*) as total_registros FROM accessops;
`;

console.log('Seeding accessops table with test data...');
console.log('SQL:', sql.substring(0, 100) + '...');
