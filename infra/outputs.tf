output "container_app_url" {
  description = "Public URL exposed by the Container App."
  value       = "https://${azurerm_container_app.this.latest_revision_fqdn}"
}

output "container_app_name" {
  description = "Container App resource name."
  value       = azurerm_container_app.this.name
}

output "mysql_fqdn" {
  description = "Private DNS name of the MySQL Flexible Server."
  value       = azurerm_mysql_flexible_server.this.fqdn
}

output "mysql_database_name" {
  description = "Created MySQL database name."
  value       = azurerm_mysql_flexible_database.this.name
}

output "mysql_admin_username" {
  description = "Administrator username for the MySQL Flexible Server."
  value       = var.mysql_admin_username
}

output "mysql_admin_password" {
  description = "Generated administrator password for the MySQL Flexible Server."
  value       = random_password.mysql_admin_password.result
  sensitive   = true
}