locals {
  normalized_prefix = lower(trim(var.name_prefix, "-"))
  mysql_firewall_ip_map = {
    for ip in var.mysql_allowed_ip_addresses : replace(ip, ".", "-") => ip
  }

  names = {
    container_app             = "${local.normalized_prefix}-app"
    container_app_environment = "${local.normalized_prefix}-env"
    container_app_infra_rg    = "ME_${local.normalized_prefix}-env_${var.resource_group_name}_${var.location}"
    log_analytics             = "${local.normalized_prefix}-law"
    mysql_database            = replace(var.mysql_database_name, "-", "_")
    mysql_private_dns_zone    = "${local.normalized_prefix}.mysql.database.azure.com"
    mysql_server              = "${local.normalized_prefix}-mysql"
    vnet                      = "${local.normalized_prefix}-vnet"
    containerapps_subnet      = "${local.normalized_prefix}-aca-snet"
    mysql_subnet              = "${local.normalized_prefix}-mysql-snet"
  }
}

resource "random_password" "mysql_admin_password" {
  length           = 24
  special          = true
  override_special = "!@#%^*-_"
}

data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

resource "azurerm_virtual_network" "this" {
  name                = local.names.vnet
  address_space       = ["10.42.0.0/16"]
  location            = data.azurerm_resource_group.this.location
  resource_group_name = data.azurerm_resource_group.this.name
  tags                = var.tags
}

resource "azurerm_subnet" "container_apps" {
  name                 = local.names.containerapps_subnet
  resource_group_name  = data.azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.42.0.0/23"]

  delegation {
    name = "container-apps-delegation"

    service_delegation {
      name = "Microsoft.App/environments"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

resource "azurerm_subnet" "mysql" {
  count                = var.mysql_public_access_enabled ? 0 : 1
  name                 = local.names.mysql_subnet
  resource_group_name  = data.azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.42.2.0/24"]

  delegation {
    name = "mysql-flexible-server-delegation"

    service_delegation {
      name = "Microsoft.DBforMySQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

resource "azurerm_private_dns_zone" "mysql" {
  count               = var.mysql_public_access_enabled ? 0 : 1
  name                = local.names.mysql_private_dns_zone
  resource_group_name = data.azurerm_resource_group.this.name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "mysql" {
  count                 = var.mysql_public_access_enabled ? 0 : 1
  name                  = "${local.normalized_prefix}-mysql-dns-link"
  resource_group_name   = data.azurerm_resource_group.this.name
  private_dns_zone_name = azurerm_private_dns_zone.mysql[0].name
  virtual_network_id    = azurerm_virtual_network.this.id
  tags                  = var.tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = local.names.log_analytics
  location            = data.azurerm_resource_group.this.location
  resource_group_name = data.azurerm_resource_group.this.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_container_app_environment" "this" {
  name                               = local.names.container_app_environment
  location                           = data.azurerm_resource_group.this.location
  resource_group_name                = data.azurerm_resource_group.this.name
  infrastructure_resource_group_name = local.names.container_app_infra_rg
  infrastructure_subnet_id           = azurerm_subnet.container_apps.id
  log_analytics_workspace_id         = azurerm_log_analytics_workspace.this.id
  tags                               = var.tags

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
    minimum_count         = 0
    maximum_count         = 0
  }
}

resource "azurerm_mysql_flexible_server" "this" {
  name                   = local.names.mysql_server
  location               = data.azurerm_resource_group.this.location
  resource_group_name    = data.azurerm_resource_group.this.name
  administrator_login    = var.mysql_admin_username
  administrator_password = random_password.mysql_admin_password.result
  backup_retention_days  = var.mysql_backup_retention_days
  delegated_subnet_id    = var.mysql_public_access_enabled ? null : azurerm_subnet.mysql[0].id
  private_dns_zone_id    = var.mysql_public_access_enabled ? null : azurerm_private_dns_zone.mysql[0].id
  sku_name               = var.mysql_sku_name
  storage {
    size_gb = floor(var.mysql_storage_mb / 1024)
  }
  version = var.mysql_version
  zone    = "1"
  tags    = var.tags

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.mysql
  ]
}

resource "azurerm_mysql_flexible_server_firewall_rule" "allowed_ips" {
  for_each            = var.mysql_public_access_enabled ? local.mysql_firewall_ip_map : {}
  name                = "allow-${each.key}"
  resource_group_name = data.azurerm_resource_group.this.name
  server_name         = azurerm_mysql_flexible_server.this.name
  start_ip_address    = each.value
  end_ip_address      = each.value
}

resource "azurerm_mysql_flexible_database" "this" {
  name                = local.names.mysql_database
  resource_group_name = data.azurerm_resource_group.this.name
  server_name         = azurerm_mysql_flexible_server.this.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}

resource "azurerm_container_app" "this" {
  name                         = local.names.container_app
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = data.azurerm_resource_group.this.name
  revision_mode                = "Single"
  tags                         = var.tags

  secret {
    name  = "docker-registry-password"
    value = var.docker_registry_password
  }

  secret {
    name  = "mysql-password"
    value = random_password.mysql_admin_password.result
  }

  secret {
    name  = "database-url"
    value = "mysql://${var.mysql_admin_username}:${urlencode(random_password.mysql_admin_password.result)}@${azurerm_mysql_flexible_server.this.fqdn}:3306/${azurerm_mysql_flexible_database.this.name}"
  }

  registry {
    server               = var.docker_registry_server
    username             = var.docker_registry_username
    password_secret_name = "docker-registry-password"
  }

  ingress {
    external_enabled = true
    target_port      = var.container_port

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.container_image
      cpu    = var.container_cpu
      memory = var.container_memory

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name  = "LOG_LEVEL"
        value = "info"
      }

      env {
        name  = "NODE_ENV"
        value = "development"
      }

      env {
        name  = "PORT"
        value = tostring(var.container_port)
      }
    }
  }
}