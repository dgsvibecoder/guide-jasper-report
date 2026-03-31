import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class SeedData {
    public static void main(String[] args) throws Exception {
        String dbUrl = "jdbc:postgresql://172.30.64.1:5432/jasper-report-ai?sslmode=disable";
        String dbUser = "postgres";
        String dbPassword = "postgres";

        System.out.println("Connecting to database...");
        Class.forName("org.postgresql.Driver");
        
        try (Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword)) {
            System.out.println("Connected!");
            
            try (Statement stmt = conn.createStatement()) {
                // Create table
                String createTable = "CREATE TABLE IF NOT EXISTS accessops (" +
                    "idazienda INT, " +
                    "nomeazienda VARCHAR(500), " +
                    "idps INT, " +
                    "nomeps VARCHAR(500), " +
                    "idaccesso INT PRIMARY KEY, " +
                    "idpaziente INT, " +
                    "datainserimento TIMESTAMP, " +
                    "dataaccettazione TIMESTAMP, " +
                    "datadimissione TIMESTAMP, " +
                    "idcodiceesterno VARCHAR(100), " +
                    "ticket VARCHAR(100))";
                
                stmt.execute(createTable);
                System.out.println("Table created.");
                
                // Clear data
                stmt.execute("DELETE FROM accessops");
                System.out.println("Data cleared.");
                
                // Insert test data
                String[] inserts = {
                    "INSERT INTO accessops VALUES (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1001, 5001, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', 'EXT-2026-00001', 'TKT-2026-00001')",
                    "INSERT INTO accessops VALUES (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1002, 5002, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '10 minutes', NOW() - INTERVAL '4 days' + INTERVAL '1 hour 30 minutes', 'EXT-2026-00002', 'TKT-2026-00002')",
                    "INSERT INTO accessops VALUES (1, 'Empresa ABC Saúde', 502, 'PS Vila Mariana', 1003, 5003, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes', NOW() - INTERVAL '3 days' + INTERVAL '45 minutes', 'EXT-2026-00003', 'TKT-2026-00003')",
                    "INSERT INTO accessops VALUES (2, 'Clinica XYZ', 503, 'PS Zona Leste', 1004, 5004, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '8 minutes', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'EXT-2026-00004', 'TKT-2026-00004')",
                    "INSERT INTO accessops VALUES (2, 'Clinica XYZ', 502, 'PS Vila Mariana', 1005, 5005, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes', NULL, 'EXT-2026-00005', 'TKT-2026-00005')",
                    "INSERT INTO accessops VALUES (1, 'Empresa ABC Saúde', 501, 'PS Centro - São Paulo', 1006, 5006, NOW(), NOW() + INTERVAL '1 minute', NULL, 'EXT-2026-00006', 'TKT-2026-00006')",
                    "INSERT INTO accessops VALUES (2, 'Clinica XYZ', 503, 'PS Zona Leste', 1007, 5007, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '7 minutes', NOW() - INTERVAL '6 days' + INTERVAL '4 hours', 'EXT-2026-00007', 'TKT-2026-00007')",
                    "INSERT INTO accessops VALUES (1, 'Empresa ABC Saúde', 502, 'PS Vila Mariana', 1008, 5008, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '15 minutes', NOW() - INTERVAL '8 days' + INTERVAL '2 hours 30 minutes', 'EXT-2026-00008', 'TKT-2026-00008')"
                };
                
                int inserted = 0;
                for (String insert : inserts) {
                    stmt.execute(insert);
                    inserted++;
                }
                System.out.println("Inserted " + inserted + " rows.");
                
                // Verify
                var resultSet = stmt.executeQuery("SELECT COUNT(*) as total FROM accessops");
                if (resultSet.next()) {
                    System.out.println("Total records in accessops: " + resultSet.getInt("total"));
                }
            }
        }
        
        System.out.println("Seeding complete!");
    }
}
