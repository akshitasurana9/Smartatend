import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
public class MySQLConnectExample {
    public static void main(String[] args) {
        // Database credentials
        String url = "jdbc:mysql://localhost:3306/smartattend?serverTimezone=UTC";
        String username = "root"; // replace with your MySQL username
        String password = ""; // replace with your MySQL password
        // SQL query
        String sql = "SELECT * FROM student"; // replace with your table name
        // Try-with-resources ensures automatic closing of resources
        try (Connection conn = DriverManager.getConnection(url, username, password);
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                // Example: retrieve data from columns
                // int id = rs.getInt("id");
                // String name = rs.getString("name");
                // System.out.println("ID: " + id + ", Name: " + name);
            }
            System.out.println("Connected");
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
