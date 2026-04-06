variable "subscription_id" {
  description = "Azure subscription ID that Terraform should target."
  type        = string
  default     = "f3f2ca0d-ff22-4e12-b86f-b32ddf56d95b"
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "southeastasia"
}

variable "resource_group_name" {
  description = "Existing resource group that Terraform should use for this stack."
  type        = string
  default     = "rg-Rahman"
}

variable "name_prefix" {
  description = "Short prefix used in resource names."
  type        = string
  default     = "rahman-govtech-assess-"
}

variable "container_image" {
  description = "Full container image reference, for example docker.io/org/app:tag."
  type        = string
}

variable "container_port" {
  description = "Port exposed by the application container."
  type        = number
  default     = 80
}

variable "container_cpu" {
  description = "vCPU allocated to the container app revision."
  type        = number
  default     = 0.5
}

variable "container_memory" {
  description = "Memory allocated to the container app revision."
  type        = string
  default     = "1Gi"
}

variable "min_replicas" {
  description = "Minimum number of container app replicas."
  type        = number
  default     = 1
}

variable "max_replicas" {
  description = "Maximum number of container app replicas."
  type        = number
  default     = 2
}

variable "docker_registry_server" {
  description = "Container registry server for the application image."
  type        = string
  default     = "index.docker.io"
}

variable "docker_registry_username" {
  description = "Username for the private container registry."
  type        = string
}

variable "docker_registry_password" {
  description = "Password or access token for the private container registry."
  type        = string
  sensitive   = true
}

variable "mysql_admin_username" {
  description = "Administrator username for the MySQL Flexible Server."
  type        = string
  default     = "mysqladmin"
}

variable "mysql_database_name" {
  description = "Application database name to create on the MySQL server."
  type        = string
  default     = "teacheradministration"
}

variable "mysql_sku_name" {
  description = "SKU for the MySQL Flexible Server."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "mysql_public_access_enabled" {
  description = "Whether MySQL should use a public endpoint protected by firewall rules instead of private VNet access."
  type        = bool
  default     = true
}

variable "mysql_allowed_ip_addresses" {
  description = "Public IPv4 addresses allowed to reach the MySQL Flexible Server when public access is enabled."
  type        = list(string)
  default     = ["61.16.81.110"]
}

variable "mysql_storage_mb" {
  description = "Provisioned storage for MySQL in MB."
  type        = number
  default     = 32768
}

variable "mysql_backup_retention_days" {
  description = "Backup retention window for MySQL."
  type        = number
  default     = 7
}

variable "mysql_version" {
  description = "MySQL engine version."
  type        = string
  default     = "8.0.21"
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    environment = "assessment"
    managed_by  = "terraform"
    workload    = "teacher-administration-api"
  }
}