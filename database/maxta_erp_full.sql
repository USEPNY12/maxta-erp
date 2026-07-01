-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: maxta_erp
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounting_periods`
--

DROP TABLE IF EXISTS `accounting_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_periods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_number` int NOT NULL,
  `period_year` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed') DEFAULT 'open',
  `closed_by` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `period_number` (`period_number`,`period_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounting_periods`
--

LOCK TABLES `accounting_periods` WRITE;
/*!40000 ALTER TABLE `accounting_periods` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounting_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ap_invoices`
--

DROP TABLE IF EXISTS `ap_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) NOT NULL,
  `vendor_id` int NOT NULL,
  `purchase_order_id` int DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `freight` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `status` enum('draft','posted','partial','paid','void') DEFAULT 'draft',
  `terms` varchar(50) DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vendor_id` (`vendor_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  CONSTRAINT `ap_invoices_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `ap_invoices_ibfk_2` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ap_invoices`
--

LOCK TABLES `ap_invoices` WRITE;
/*!40000 ALTER TABLE `ap_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `ap_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_queue`
--

DROP TABLE IF EXISTS `approval_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workflow_id` int NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `document_id` int NOT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `requested_by` int DEFAULT NULL,
  `approver_id` int DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `trigger_reason` varchar(500) DEFAULT NULL,
  `trigger_value` decimal(15,2) DEFAULT NULL,
  `comments` text,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `decision_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_queue`
--

LOCK TABLES `approval_queue` WRITE;
/*!40000 ALTER TABLE `approval_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `approval_workflows`
--

DROP TABLE IF EXISTS `approval_workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_workflows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `document_type` enum('quote','sales_order','purchase_order') NOT NULL,
  `condition_field` varchar(100) NOT NULL,
  `condition_operator` enum('gt','lt','gte','lte','eq','between') NOT NULL,
  `condition_value` decimal(15,2) NOT NULL,
  `condition_value2` decimal(15,2) DEFAULT NULL,
  `approver_role` varchar(100) DEFAULT NULL,
  `approver_user_id` int DEFAULT NULL,
  `priority` int DEFAULT '1',
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_workflows`
--

LOCK TABLES `approval_workflows` WRITE;
/*!40000 ALTER TABLE `approval_workflows` DISABLE KEYS */;
INSERT INTO `approval_workflows` VALUES (1,'High Value Quote','quote','total','gt',10000.00,NULL,'admin',NULL,1,1,'2026-06-27 18:07:44'),(2,'Large Discount','quote','max_discount_percent','gt',15.00,NULL,'admin',NULL,2,1,'2026-06-27 18:07:44'),(3,'Low Margin Alert','quote','min_margin_percent','lt',20.00,NULL,'admin',NULL,3,1,'2026-06-27 18:07:44'),(4,'High Value PO','purchase_order','total','gt',25000.00,NULL,'admin',NULL,1,1,'2026-06-27 18:07:44');
/*!40000 ALTER TABLE `approval_workflows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ar_invoice_lines`
--

DROP TABLE IF EXISTS `ar_invoice_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ar_invoice_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) DEFAULT NULL,
  `unit_price` decimal(12,4) DEFAULT NULL,
  `line_total` decimal(12,2) DEFAULT NULL,
  `gl_account_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `item_id` (`item_id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `ar_invoice_lines_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ar_invoice_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `ar_invoice_lines_ibfk_3` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ar_invoice_lines`
--

LOCK TABLES `ar_invoice_lines` WRITE;
/*!40000 ALTER TABLE `ar_invoice_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `ar_invoice_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ar_invoices`
--

DROP TABLE IF EXISTS `ar_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ar_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `sales_order_id` int DEFAULT NULL,
  `shipment_id` int DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `status` enum('draft','posted','partial','paid','void') DEFAULT 'draft',
  `terms` varchar(50) DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `customer_id` (`customer_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `shipment_id` (`shipment_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `idx_ari_status` (`status`),
  CONSTRAINT `ar_invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `ar_invoices_ibfk_2` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `ar_invoices_ibfk_3` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`),
  CONSTRAINT `ar_invoices_ibfk_4` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ar_invoices`
--

LOCK TABLES `ar_invoices` WRITE;
/*!40000 ALTER TABLE `ar_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `ar_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_reconciliation`
--

DROP TABLE IF EXISTS `bank_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_reconciliation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_id` int NOT NULL,
  `statement_date` date NOT NULL,
  `statement_balance` decimal(14,2) NOT NULL,
  `book_balance` decimal(14,2) DEFAULT NULL,
  `adjusted_balance` decimal(14,2) DEFAULT NULL,
  `difference` decimal(14,2) DEFAULT NULL,
  `status` enum('in_progress','reconciled') DEFAULT 'in_progress',
  `reconciled_by` int DEFAULT NULL,
  `reconciled_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `bank_reconciliation_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_reconciliation`
--

LOCK TABLES `bank_reconciliation` WRITE;
/*!40000 ALTER TABLE `bank_reconciliation` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_reconciliation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_statement_lines`
--

DROP TABLE IF EXISTS `bank_statement_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_statement_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `statement_id` int NOT NULL,
  `transaction_date` date NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `amount` decimal(14,2) NOT NULL,
  `type` enum('deposit','withdrawal') NOT NULL,
  `matched_voucher_id` int DEFAULT NULL,
  `matched_payment_id` int DEFAULT NULL,
  `match_confidence` decimal(5,2) DEFAULT NULL,
  `match_status` enum('unmatched','auto_matched','manual_matched','confirmed') DEFAULT 'unmatched',
  `category` varchar(50) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_statement_lines`
--

LOCK TABLES `bank_statement_lines` WRITE;
/*!40000 ALTER TABLE `bank_statement_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_statement_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_statements`
--

DROP TABLE IF EXISTS `bank_statements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_statements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_id` int NOT NULL,
  `statement_date` date NOT NULL,
  `opening_balance` decimal(14,2) NOT NULL,
  `closing_balance` decimal(14,2) NOT NULL,
  `total_deposits` decimal(14,2) DEFAULT '0.00',
  `total_withdrawals` decimal(14,2) DEFAULT '0.00',
  `transaction_count` int DEFAULT '0',
  `imported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `imported_by` int DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `status` enum('imported','in_progress','reconciled') DEFAULT 'imported',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_statements`
--

LOCK TABLES `bank_statements` WRITE;
/*!40000 ALTER TABLE `bank_statements` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_statements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `banks`
--

DROP TABLE IF EXISTS `banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bank_name` varchar(100) NOT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `routing_number` varchar(20) DEFAULT NULL,
  `gl_account_id` int DEFAULT NULL,
  `current_balance` decimal(14,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `banks_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `banks`
--

LOCK TABLES `banks` WRITE;
/*!40000 ALTER TABLE `banks` DISABLE KEYS */;
/*!40000 ALTER TABLE `banks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barcode_scan_log`
--

DROP TABLE IF EXISTS `barcode_scan_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `barcode_scan_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barcode` varchar(255) NOT NULL,
  `scan_type` enum('wo_start','wo_complete','wo_pause','station_in','station_out','qc_pass','qc_fail','material_issue','rack_load','rack_unload') NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `work_center_id` int DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `quantity` decimal(12,4) DEFAULT '1.0000',
  `metadata` json DEFAULT NULL,
  `scanned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scan_wo` (`work_order_id`),
  KEY `idx_scan_wc` (`work_center_id`),
  KEY `idx_scan_date` (`scanned_at`),
  KEY `idx_scan_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barcode_scan_log`
--

LOCK TABLES `barcode_scan_log` WRITE;
/*!40000 ALTER TABLE `barcode_scan_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `barcode_scan_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_document_items`
--

DROP TABLE IF EXISTS `batch_document_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_document_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `document_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `status` enum('pending','generated','emailed','failed') DEFAULT 'pending',
  `file_path` varchar(500) DEFAULT NULL,
  `error_message` text,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_batch_job` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_document_items`
--

LOCK TABLES `batch_document_items` WRITE;
/*!40000 ALTER TABLE `batch_document_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_document_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_document_jobs`
--

DROP TABLE IF EXISTS `batch_document_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_document_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_type` enum('statements','invoices','quotes','purchase_orders') NOT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `total_documents` int DEFAULT '0',
  `processed_documents` int DEFAULT '0',
  `failed_documents` int DEFAULT '0',
  `parameters` json DEFAULT NULL,
  `error_log` text,
  `started_by` int DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_document_jobs`
--

LOCK TABLES `batch_document_jobs` WRITE;
/*!40000 ALTER TABLE `batch_document_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_document_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_headers`
--

DROP TABLE IF EXISTS `bom_headers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_headers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `batch_size` decimal(12,4) DEFAULT '1.0000',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `bom_headers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_headers`
--

LOCK TABLES `bom_headers` WRITE;
/*!40000 ALTER TABLE `bom_headers` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_headers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_lines`
--

DROP TABLE IF EXISTS `bom_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bom_id` int NOT NULL,
  `sequence` int NOT NULL,
  `component_item_id` int NOT NULL,
  `quantity_per` decimal(12,6) NOT NULL,
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `uom` varchar(20) DEFAULT NULL,
  `operation_sequence` int DEFAULT NULL,
  `is_fixed_qty` tinyint(1) DEFAULT '0',
  `reference_designator` varchar(50) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `component_item_id` (`component_item_id`),
  CONSTRAINT `bom_lines_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bom_headers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bom_lines_ibfk_2` FOREIGN KEY (`component_item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_lines`
--

LOCK TABLES `bom_lines` WRITE;
/*!40000 ALTER TABLE `bom_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budget_lines`
--

DROP TABLE IF EXISTS `budget_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budget_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `budget_id` int NOT NULL,
  `gl_account_id` int NOT NULL,
  `period_1` decimal(14,2) DEFAULT '0.00',
  `period_2` decimal(14,2) DEFAULT '0.00',
  `period_3` decimal(14,2) DEFAULT '0.00',
  `period_4` decimal(14,2) DEFAULT '0.00',
  `period_5` decimal(14,2) DEFAULT '0.00',
  `period_6` decimal(14,2) DEFAULT '0.00',
  `period_7` decimal(14,2) DEFAULT '0.00',
  `period_8` decimal(14,2) DEFAULT '0.00',
  `period_9` decimal(14,2) DEFAULT '0.00',
  `period_10` decimal(14,2) DEFAULT '0.00',
  `period_11` decimal(14,2) DEFAULT '0.00',
  `period_12` decimal(14,2) DEFAULT '0.00',
  `annual_total` decimal(14,2) DEFAULT '0.00',
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budget_lines`
--

LOCK TABLES `budget_lines` WRITE;
/*!40000 ALTER TABLE `budget_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `budget_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `budgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `fiscal_year` int NOT NULL,
  `budget_type` enum('annual','quarterly','monthly') DEFAULT 'annual',
  `status` enum('draft','approved','active','closed') DEFAULT 'draft',
  `total_amount` decimal(14,2) DEFAULT '0.00',
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `budgets`
--

LOCK TABLES `budgets` WRITE;
/*!40000 ALTER TABLE `budgets` DISABLE KEYS */;
INSERT INTO `budgets` VALUES (1,'FY2026 Operating Budget',2026,'annual','active',2400000.00,NULL,NULL,'Annual operating budget for fiscal year 2026',NULL,'2026-06-29 14:12:44');
/*!40000 ALTER TABLE `budgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carriers`
--

DROP TABLE IF EXISTS `carriers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carriers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carriers`
--

LOCK TABLES `carriers` WRITE;
/*!40000 ALTER TABLE `carriers` DISABLE KEYS */;
/*!40000 ALTER TABLE `carriers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_flow_categories`
--

DROP TABLE IF EXISTS `cash_flow_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_flow_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category_type` enum('operating','investing','financing') NOT NULL,
  `gl_account_id` int DEFAULT NULL,
  `is_inflow` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_flow_categories`
--

LOCK TABLES `cash_flow_categories` WRITE;
/*!40000 ALTER TABLE `cash_flow_categories` DISABLE KEYS */;
INSERT INTO `cash_flow_categories` VALUES (1,'Customer Collections','operating',NULL,1,1),(2,'Vendor Payments','operating',NULL,0,2),(3,'Payroll','operating',NULL,0,3),(4,'Tax Payments','operating',NULL,0,4),(5,'Utilities & Rent','operating',NULL,0,5),(6,'Equipment Purchase','investing',NULL,0,6),(7,'Equipment Sale','investing',NULL,1,7),(8,'Loan Proceeds','financing',NULL,1,8),(9,'Loan Payments','financing',NULL,0,9),(10,'Owner Distributions','financing',NULL,0,10);
/*!40000 ALTER TABLE `cash_flow_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_flow_projections`
--

DROP TABLE IF EXISTS `cash_flow_projections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_flow_projections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projection_date` date NOT NULL,
  `category_id` int DEFAULT NULL,
  `source_type` varchar(50) DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `projected_amount` decimal(14,2) NOT NULL,
  `actual_amount` decimal(14,2) DEFAULT NULL,
  `confidence_level` enum('high','medium','low') DEFAULT 'medium',
  `status` enum('projected','realized','cancelled') DEFAULT 'projected',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_flow_projections`
--

LOCK TABLES `cash_flow_projections` WRITE;
/*!40000 ALTER TABLE `cash_flow_projections` DISABLE KEYS */;
/*!40000 ALTER TABLE `cash_flow_projections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commission_rules`
--

DROP TABLE IF EXISTS `commission_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commission_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `salesperson_id` int DEFAULT NULL,
  `customer_type` varchar(50) DEFAULT 'all',
  `min_revenue` decimal(15,2) DEFAULT '0.00',
  `max_revenue` decimal(15,2) DEFAULT '999999999.00',
  `commission_rate` decimal(5,2) NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commission_rules`
--

LOCK TABLES `commission_rules` WRITE;
/*!40000 ALTER TABLE `commission_rules` DISABLE KEYS */;
INSERT INTO `commission_rules` VALUES (1,'Default Rate',NULL,'all',0.00,999999999.00,5.00,1,'2026-06-27 18:07:44'),(2,'High Value Bonus',NULL,'all',50000.00,999999999.00,7.50,1,'2026-06-27 18:07:44'),(3,'New Customer Premium',NULL,'new',0.00,999999999.00,8.00,1,'2026-06-27 18:07:44');
/*!40000 ALTER TABLE `commission_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `commissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `salesperson_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `invoice_amount` decimal(12,2) NOT NULL,
  `commission_amount` decimal(12,2) NOT NULL,
  `status` enum('pending','approved','paid') DEFAULT 'pending',
  `paid_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
/*!40000 ALTER TABLE `commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_branding`
--

DROP TABLE IF EXISTS `company_branding`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_branding` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_branding`
--

LOCK TABLES `company_branding` WRITE;
/*!40000 ALTER TABLE `company_branding` DISABLE KEYS */;
INSERT INTO `company_branding` VALUES (1,'company_name','Max TA Group','2026-06-27 20:13:45'),(2,'company_address','123 Glass Industry Blvd, Suite 100','2026-06-27 20:13:45'),(3,'company_city','Houston','2026-06-27 20:13:45'),(4,'company_state','TX','2026-06-27 20:13:45'),(5,'company_zip','77001','2026-06-27 20:13:45'),(6,'company_phone','(713) 555-0100','2026-06-27 20:13:45'),(7,'company_fax','(713) 555-0101','2026-06-27 20:13:45'),(8,'company_email','info@maxtagroup.com','2026-06-27 20:13:45'),(9,'company_website','www.maxtagroup.com','2026-06-27 20:13:45'),(10,'company_logo_url','','2026-06-27 20:13:45'),(11,'primary_color','#1e40af','2026-06-27 20:13:45'),(12,'secondary_color','#3b82f6','2026-06-27 20:13:45'),(13,'accent_color','#f59e0b','2026-06-27 20:13:45'),(14,'document_footer','Thank you for your business! Terms: Net 30. Late payments subject to 1.5% monthly finance charge.','2026-06-27 20:13:45'),(15,'quote_terms','This quote is valid for 30 days from the date above. Prices are subject to change after expiration.','2026-06-27 20:13:45'),(16,'invoice_terms','Payment is due within 30 days of invoice date. Please reference invoice number on your payment.','2026-06-27 20:13:45'),(17,'po_terms','Please confirm receipt of this purchase order and provide estimated delivery date within 48 hours.','2026-06-27 20:13:45');
/*!40000 ALTER TABLE `company_branding` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_info`
--

DROP TABLE IF EXISTS `company_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `address_line1` varchar(100) DEFAULT NULL,
  `address_line2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_info`
--

LOCK TABLES `company_info` WRITE;
/*!40000 ALTER TABLE `company_info` DISABLE KEYS */;
INSERT INTO `company_info` VALUES (1,'Max TA Group LLC',NULL,NULL,'New York','NY',NULL,'USA','',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `company_info` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_activities`
--

DROP TABLE IF EXISTS `crm_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `activity_type` enum('call','email','meeting','note','task','follow-up') DEFAULT 'note',
  `subject` varchar(255) DEFAULT NULL,
  `description` text,
  `due_date` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_activities`
--

LOCK TABLES `crm_activities` WRITE;
/*!40000 ALTER TABLE `crm_activities` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_leads`
--

DROP TABLE IF EXISTS `crm_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `crm_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `status` enum('new','contacted','qualified','proposal','negotiation','won','lost') DEFAULT 'new',
  `estimated_value` decimal(12,2) DEFAULT NULL,
  `notes` text,
  `assigned_to` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_leads`
--

LOCK TABLES `crm_leads` WRITE;
/*!40000 ALTER TABLE `crm_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `currency_transactions`
--

DROP TABLE IF EXISTS `currency_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `currency_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('ar_invoice','ap_invoice','customer_payment','vendor_payment','quote','sales_order','purchase_order') NOT NULL,
  `transaction_id` int NOT NULL,
  `currency_code` varchar(3) NOT NULL DEFAULT 'USD',
  `exchange_rate` decimal(12,6) NOT NULL DEFAULT '1.000000',
  `original_amount` decimal(14,2) NOT NULL,
  `base_amount` decimal(14,2) NOT NULL,
  `realized_gain_loss` decimal(14,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `currency_transactions`
--

LOCK TABLES `currency_transactions` WRITE;
/*!40000 ALTER TABLE `currency_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `currency_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_contacts`
--

DROP TABLE IF EXISTS `customer_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `title` varchar(50) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `customer_contacts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_contacts`
--

LOCK TABLES `customer_contacts` WRITE;
/*!40000 ALTER TABLE `customer_contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('check','wire','ach','credit_card','cash') NOT NULL,
  `reference_number` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `bank_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `customer_id` (`customer_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_portal_access_log`
--

DROP TABLE IF EXISTS `customer_portal_access_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_portal_access_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `token_id` int DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_id` int DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_portal_log_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_portal_access_log`
--

LOCK TABLES `customer_portal_access_log` WRITE;
/*!40000 ALTER TABLE `customer_portal_access_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_portal_access_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_portal_tokens`
--

DROP TABLE IF EXISTS `customer_portal_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_portal_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `token` varchar(128) NOT NULL,
  `token_type` enum('session','document_link','statement_link') DEFAULT 'session',
  `document_type` varchar(50) DEFAULT NULL,
  `document_id` int DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `last_accessed` datetime DEFAULT NULL,
  `access_count` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_portal_customer` (`customer_id`),
  KEY `idx_portal_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_portal_tokens`
--

LOCK TABLES `customer_portal_tokens` WRITE;
/*!40000 ALTER TABLE `customer_portal_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_portal_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_statements`
--

DROP TABLE IF EXISTS `customer_statements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_statements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `statement_date` date NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `opening_balance` decimal(12,2) DEFAULT '0.00',
  `total_invoiced` decimal(12,2) DEFAULT '0.00',
  `total_payments` decimal(12,2) DEFAULT '0.00',
  `total_credits` decimal(12,2) DEFAULT '0.00',
  `closing_balance` decimal(12,2) DEFAULT '0.00',
  `file_path` varchar(500) DEFAULT NULL,
  `emailed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stmt_customer` (`customer_id`),
  KEY `idx_stmt_date` (`statement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_statements`
--

LOCK TABLES `customer_statements` WRITE;
/*!40000 ALTER TABLE `customer_statements` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_statements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_types`
--

DROP TABLE IF EXISTS `customer_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_types`
--

LOCK TABLES `customer_types` WRITE;
/*!40000 ALTER TABLE `customer_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_number` varchar(20) NOT NULL,
  `company_name` varchar(100) NOT NULL,
  `dba_name` varchar(200) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `bill_address1` varchar(100) DEFAULT NULL,
  `bill_address2` varchar(100) DEFAULT NULL,
  `bill_city` varchar(50) DEFAULT NULL,
  `bill_state` varchar(50) DEFAULT NULL,
  `bill_zip` varchar(20) DEFAULT NULL,
  `bill_country` varchar(50) DEFAULT 'USA',
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `ship_country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `customer_type_id` int DEFAULT NULL,
  `tax_group_id` int DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `payment_method` varchar(50) DEFAULT NULL,
  `credit_limit` decimal(12,2) DEFAULT '0.00',
  `credit_status` enum('approved','pending','denied','suspended') DEFAULT 'approved',
  `credit_approved_by` varchar(100) DEFAULT NULL,
  `credit_approved_date` date DEFAULT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `finance_charge_exempt` tinyint(1) DEFAULT '0',
  `send_statements` tinyint(1) DEFAULT '1',
  `statement_cycle` enum('monthly','weekly','biweekly') DEFAULT 'monthly',
  `collection_priority` enum('normal','high','low') DEFAULT 'normal',
  `current_balance` decimal(12,2) DEFAULT '0.00',
  `price_list_id` int DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `carrier_id` int DEFAULT NULL,
  `tax_exempt` tinyint(1) DEFAULT '0',
  `tax_exempt_number` varchar(50) DEFAULT NULL,
  `resale_cert_number` varchar(50) DEFAULT NULL,
  `tax_exempt_expiry` date DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `shipping_method` varchar(50) DEFAULT NULL,
  `freight_terms` varchar(50) DEFAULT NULL,
  `preferred_delivery_days` varchar(100) DEFAULT NULL,
  `delivery_time_window` varchar(50) DEFAULT NULL,
  `requires_appointment` tinyint(1) DEFAULT '0',
  `has_liftgate` tinyint(1) DEFAULT '0',
  `has_loading_dock` tinyint(1) DEFAULT '0',
  `max_truck_size` varchar(50) DEFAULT NULL,
  `delivery_contact` varchar(100) DEFAULT NULL,
  `route_zone` varchar(50) DEFAULT NULL,
  `quality_tier` enum('standard','premium','architectural') DEFAULT 'standard',
  `recut_policy` enum('standard','free_recuts','charge_all','first_free') DEFAULT 'standard',
  `breakage_claim_days` int DEFAULT '30',
  `requires_coc` tinyint(1) DEFAULT '0',
  `rack_return_required` tinyint(1) DEFAULT '0',
  `rack_deposit` decimal(10,2) DEFAULT '0.00',
  `racks_at_customer` int DEFAULT '0',
  `lead_time_days` int DEFAULT NULL,
  `min_order_amount` decimal(10,2) DEFAULT '0.00',
  `alert_message` text,
  `internal_notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `status` enum('active','inactive','on_hold','prospect','cod_only') DEFAULT 'active',
  `industry` varchar(100) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `territory` varchar(100) DEFAULT NULL,
  `account_manager` varchar(100) DEFAULT NULL,
  `currency_code` varchar(10) DEFAULT 'USD',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_number` (`customer_number`),
  KEY `customer_type_id` (`customer_type_id`),
  KEY `tax_group_id` (`tax_group_id`),
  KEY `price_list_id` (`price_list_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `carrier_id` (`carrier_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`customer_type_id`) REFERENCES `customer_types` (`id`),
  CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`tax_group_id`) REFERENCES `tax_groups` (`id`),
  CONSTRAINT `customers_ibfk_3` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists` (`id`),
  CONSTRAINT `customers_ibfk_4` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `customers_ibfk_5` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'C-10001','ABC Glass Distributors',NULL,'John Smith','123 Main St',NULL,'Miami','FL','33101','USA',NULL,NULL,NULL,NULL,NULL,'USA','555-0101',NULL,'john@abcglass.com',NULL,NULL,NULL,'Net 30',NULL,50000.00,'approved',NULL,NULL,0.00,0,1,'monthly','normal',0.00,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,NULL,NULL,NULL,'standard','standard',30,0,0,0.00,0,NULL,0.00,NULL,NULL,1,'active',NULL,NULL,NULL,NULL,'USD',NULL,'2026-06-29 14:11:05','2026-06-29 14:11:05'),(2,'C-10002','ABC Glass Corp',NULL,'Jane Doe','456 Oak Ave',NULL,'Orlando','FL','32801','USA',NULL,NULL,NULL,NULL,NULL,'USA','555-0102',NULL,'jane@abcglasscorp.com',NULL,NULL,NULL,'Net 30',NULL,75000.00,'approved',NULL,NULL,0.00,0,1,'monthly','normal',0.00,NULL,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,NULL,NULL,NULL,'standard','standard',30,0,0,0.00,0,NULL,0.00,NULL,NULL,1,'active',NULL,NULL,NULL,NULL,'USD',NULL,'2026-06-29 14:11:05','2026-06-29 14:11:05');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dashboard_configs`
--

DROP TABLE IF EXISTS `dashboard_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL COMMENT 'Role-level default if user_id is null',
  `layout` json NOT NULL COMMENT 'Array of widget configs with position/size',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_config` (`user_id`),
  KEY `idx_role_config` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_configs`
--

LOCK TABLES `dashboard_configs` WRITE;
/*!40000 ALTER TABLE `dashboard_configs` DISABLE KEYS */;
INSERT INTO `dashboard_configs` VALUES (1,NULL,'admin','[{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"widget\": \"sales_mtd\"}, {\"h\": 1, \"w\": 1, \"x\": 1, \"y\": 0, \"widget\": \"cash_position\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"profit_margin\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 0, \"widget\": \"inventory_value\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"revenue_trend\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 1, \"widget\": \"production_status\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 2, \"widget\": \"top_customers\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 2, \"widget\": \"overdue_invoices\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(2,NULL,'manager','[{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"widget\": \"sales_mtd\"}, {\"h\": 1, \"w\": 1, \"x\": 1, \"y\": 0, \"widget\": \"cash_position\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"profit_margin\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 0, \"widget\": \"inventory_value\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"revenue_trend\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 1, \"widget\": \"production_status\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 2, \"widget\": \"top_customers\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 2, \"widget\": \"overdue_invoices\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(3,NULL,'sales','[{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"widget\": \"sales_mtd\"}, {\"h\": 1, \"w\": 1, \"x\": 1, \"y\": 0, \"widget\": \"sales_pipeline\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"open_orders\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"bookings_chart\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 1, \"widget\": \"top_customers\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 2, \"widget\": \"overdue_invoices\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(4,NULL,'production','[{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"widget\": \"wo_throughput\"}, {\"h\": 1, \"w\": 2, \"x\": 1, \"y\": 0, \"widget\": \"production_status\"}, {\"h\": 1, \"w\": 1, \"x\": 3, \"y\": 0, \"widget\": \"shipments_today\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"low_stock_alerts\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(5,NULL,'purchasing','[{\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 0, \"widget\": \"overdue_pos\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"inventory_value\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"low_stock_alerts\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 1, \"widget\": \"ap_aging\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(6,NULL,'accounting','[{\"h\": 1, \"w\": 1, \"x\": 0, \"y\": 0, \"widget\": \"cash_position\"}, {\"h\": 1, \"w\": 1, \"x\": 1, \"y\": 0, \"widget\": \"profit_margin\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"sales_mtd\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"revenue_trend\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 1, \"widget\": \"ar_aging\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 2, \"widget\": \"ap_aging\"}, {\"h\": 1, \"w\": 2, \"x\": 2, \"y\": 2, \"widget\": \"overdue_invoices\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(7,NULL,'shipping','[{\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 0, \"widget\": \"shipments_today\"}, {\"h\": 1, \"w\": 1, \"x\": 2, \"y\": 0, \"widget\": \"open_orders\"}, {\"h\": 1, \"w\": 2, \"x\": 0, \"y\": 1, \"widget\": \"production_status\"}]',1,'2026-06-29 14:12:45','2026-06-29 14:12:45');
/*!40000 ALTER TABLE `dashboard_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dashboard_widgets`
--

DROP TABLE IF EXISTS `dashboard_widgets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dashboard_widgets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `widget_key` varchar(100) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `category` enum('financial','sales','manufacturing','inventory','purchasing','shipping','system') NOT NULL,
  `widget_type` enum('kpi','chart','table','list','gauge','map') NOT NULL,
  `data_endpoint` varchar(200) NOT NULL,
  `default_size` enum('small','medium','large','full') DEFAULT 'medium',
  `min_role_level` int DEFAULT '0' COMMENT '0=all, 1=readonly+, 2=dept+, 3=manager+, 4=admin',
  `allowed_roles` json DEFAULT NULL COMMENT 'Specific roles that can see this widget, null=check min_role_level',
  `is_active` tinyint(1) DEFAULT '1',
  `config_schema` json DEFAULT NULL COMMENT 'JSON schema for widget-specific settings',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `widget_key` (`widget_key`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_widgets`
--

LOCK TABLES `dashboard_widgets` WRITE;
/*!40000 ALTER TABLE `dashboard_widgets` DISABLE KEYS */;
INSERT INTO `dashboard_widgets` VALUES (1,'sales_mtd','Sales MTD','Month-to-date sales revenue','sales','kpi','/api/dashboard-exec/kpi/sales-mtd','small',0,NULL,1,NULL,'2026-06-29 14:12:45'),(2,'sales_pipeline','Sales Pipeline','Open quotes and orders value','sales','kpi','/api/dashboard-exec/kpi/sales-pipeline','small',0,'[\"sales\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(3,'open_orders','Open Orders','Active sales orders count','sales','kpi','/api/dashboard-exec/kpi/open-orders','small',0,NULL,1,NULL,'2026-06-29 14:12:45'),(4,'ar_aging','AR Aging','Accounts receivable aging breakdown','financial','chart','/api/dashboard-exec/charts/ar-aging','medium',2,'[\"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(5,'ap_aging','AP Aging','Accounts payable aging breakdown','financial','chart','/api/dashboard-exec/charts/ap-aging','medium',2,'[\"accounting\", \"purchasing\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(6,'cash_position','Cash Position','Total bank balance','financial','kpi','/api/dashboard-exec/kpi/cash-position','small',3,'[\"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(7,'revenue_trend','Revenue Trend','12-month revenue chart','financial','chart','/api/dashboard-exec/charts/revenue-trend','large',3,'[\"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(8,'production_status','Production Status','Work orders by status','manufacturing','chart','/api/dashboard-exec/charts/production-status','medium',0,'[\"production\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(9,'wo_throughput','WO Throughput','Work orders completed this week','manufacturing','kpi','/api/dashboard-exec/kpi/wo-throughput','small',0,'[\"production\", \"shipping\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(10,'inventory_value','Inventory Value','Total inventory valuation','inventory','kpi','/api/dashboard-exec/kpi/inventory-value','small',2,'[\"purchasing\", \"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(11,'low_stock_alerts','Low Stock Alerts','Items below reorder point','inventory','list','/api/dashboard-exec/lists/low-stock','medium',0,'[\"purchasing\", \"production\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(12,'overdue_pos','Overdue POs','Purchase orders past due date','purchasing','list','/api/dashboard-exec/lists/overdue-pos','medium',2,'[\"purchasing\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(13,'shipments_today','Shipments Today','Scheduled shipments for today','shipping','list','/api/dashboard-exec/lists/shipments-today','medium',0,'[\"shipping\", \"sales\", \"production\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(14,'top_customers','Top Customers MTD','Highest revenue customers MTD','sales','table','/api/dashboard-exec/tables/top-customers','medium',2,'[\"sales\", \"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(15,'profit_margin','Profit Margin','Gross profit margin MTD','financial','gauge','/api/dashboard-exec/kpi/profit-margin','small',3,'[\"accounting\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(16,'bookings_chart','Bookings by Week','Weekly sales bookings trend','sales','chart','/api/dashboard-exec/charts/bookings-weekly','large',2,'[\"sales\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(17,'overdue_invoices','Overdue Invoices','Past-due AR invoices','financial','list','/api/dashboard-exec/lists/overdue-invoices','medium',2,'[\"accounting\", \"sales\", \"manager\", \"admin\"]',1,NULL,'2026-06-29 14:12:45'),(18,'active_users','Active Users','Currently logged-in users','system','kpi','/api/dashboard-exec/kpi/active-users','small',4,'[\"admin\"]',1,NULL,'2026-06-29 14:12:45');
/*!40000 ALTER TABLE `dashboard_widgets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_proof`
--

DROP TABLE IF EXISTS `delivery_proof`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_proof` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_stop_id` int NOT NULL,
  `shipment_id` int DEFAULT NULL,
  `signed_by` varchar(255) DEFAULT NULL,
  `signature_data` text,
  `photo_urls` json DEFAULT NULL,
  `delivery_condition` enum('perfect','minor_damage','major_damage','refused') DEFAULT 'perfect',
  `damage_notes` text,
  `received_pieces` int DEFAULT NULL,
  `refused_pieces` int DEFAULT '0',
  `customer_comments` text,
  `gps_latitude` decimal(10,7) DEFAULT NULL,
  `gps_longitude` decimal(10,7) DEFAULT NULL,
  `delivered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pod_stop` (`delivery_stop_id`),
  KEY `idx_pod_shipment` (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_proof`
--

LOCK TABLES `delivery_proof` WRITE;
/*!40000 ALTER TABLE `delivery_proof` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_proof` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_routes`
--

DROP TABLE IF EXISTS `delivery_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_number` varchar(30) DEFAULT NULL,
  `route_name` varchar(255) NOT NULL,
  `route_date` date NOT NULL,
  `driver_id` int DEFAULT NULL,
  `vehicle_id` int DEFAULT NULL,
  `status` enum('planning','confirmed','in_progress','completed','cancelled') DEFAULT 'planning',
  `total_stops` int DEFAULT '0',
  `total_distance_miles` decimal(8,2) DEFAULT '0.00',
  `estimated_duration_hours` decimal(5,2) DEFAULT '0.00',
  `actual_start_time` datetime DEFAULT NULL,
  `actual_end_time` datetime DEFAULT NULL,
  `actual_distance_miles` decimal(8,2) DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_number` (`route_number`),
  KEY `idx_route_date` (`route_date`),
  KEY `idx_route_driver` (`driver_id`),
  KEY `idx_route_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_routes`
--

LOCK TABLES `delivery_routes` WRITE;
/*!40000 ALTER TABLE `delivery_routes` DISABLE KEYS */;
INSERT INTO `delivery_routes` VALUES (1,'RT-0001','Downtown Delivery','2026-06-27',1,1,'planning',1,0.00,0.00,NULL,NULL,NULL,NULL,1,'2026-06-27 20:15:26');
/*!40000 ALTER TABLE `delivery_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_stops`
--

DROP TABLE IF EXISTS `delivery_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_stops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int NOT NULL,
  `stop_sequence` int NOT NULL,
  `shipment_id` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `delivery_address` text NOT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `scheduled_arrival` datetime DEFAULT NULL,
  `actual_arrival` datetime DEFAULT NULL,
  `actual_departure` datetime DEFAULT NULL,
  `status` enum('pending','en_route','arrived','delivered','failed','skipped') DEFAULT 'pending',
  `delivery_notes` text,
  `special_instructions` text,
  `pieces_count` int DEFAULT '0',
  `weight_lbs` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_stop_route` (`route_id`),
  KEY `idx_stop_shipment` (`shipment_id`),
  KEY `idx_stop_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_stops`
--

LOCK TABLES `delivery_stops` WRITE;
/*!40000 ALTER TABLE `delivery_stops` DISABLE KEYS */;
INSERT INTO `delivery_stops` VALUES (1,1,1,NULL,1,'123 Main St, Toronto',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'pending',NULL,NULL,0,0.00);
/*!40000 ALTER TABLE `delivery_stops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_zones`
--

DROP TABLE IF EXISTS `delivery_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_zones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone_name` varchar(100) NOT NULL,
  `zone_code` varchar(20) NOT NULL,
  `zip_codes` text,
  `base_delivery_fee` decimal(8,2) DEFAULT '0.00',
  `per_mile_rate` decimal(6,4) DEFAULT '0.0000',
  `min_order_free_delivery` decimal(10,2) DEFAULT NULL,
  `estimated_transit_days` int DEFAULT '1',
  `max_pieces_per_trip` int DEFAULT '50',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zone_code` (`zone_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_zones`
--

LOCK TABLES `delivery_zones` WRITE;
/*!40000 ALTER TABLE `delivery_zones` DISABLE KEYS */;
INSERT INTO `delivery_zones` VALUES (1,'Houston Metro','HOU-METRO',NULL,75.00,2.5000,2500.00,0,100,1,NULL,'2026-06-27 20:13:46'),(2,'Houston Suburbs','HOU-BURBS',NULL,125.00,3.0000,5000.00,1,75,1,NULL,'2026-06-27 20:13:46'),(3,'Gulf Coast','GULF',NULL,250.00,3.5000,10000.00,1,50,1,NULL,'2026-06-27 20:13:46'),(4,'Central Texas','CTX',NULL,400.00,4.0000,15000.00,2,40,1,NULL,'2026-06-27 20:13:46'),(5,'DFW Metro','DFW',NULL,500.00,4.5000,20000.00,2,40,1,NULL,'2026-06-27 20:13:46'),(6,'Out of State','OOS',NULL,750.00,5.0000,30000.00,3,30,1,NULL,'2026-06-27 20:13:46');
/*!40000 ALTER TABLE `delivery_zones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_racks`
--

DROP TABLE IF EXISTS `dispatch_racks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_racks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_number` varchar(50) DEFAULT NULL,
  `rack_type` enum('A-frame','L-frame','Harp','Flat') DEFAULT 'A-frame',
  `capacity_slots` int DEFAULT '20',
  `current_load` int DEFAULT '0',
  `status` enum('available','in-use','in-transit','maintenance','retired') DEFAULT 'available',
  `location` varchar(255) DEFAULT NULL,
  `assigned_route_id` int DEFAULT NULL,
  `last_inspection` date DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rack_number` (`rack_number`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_racks`
--

LOCK TABLES `dispatch_racks` WRITE;
/*!40000 ALTER TABLE `dispatch_racks` DISABLE KEYS */;
INSERT INTO `dispatch_racks` VALUES (1,'RACK-001','A-frame',20,0,'available','Warehouse Bay 1',NULL,NULL,NULL,'2026-06-27 15:20:40'),(2,'RACK-002','A-frame',20,0,'available','Warehouse Bay 2',NULL,NULL,NULL,'2026-06-27 15:20:40'),(3,'RACK-003','L-frame',15,0,'available','Warehouse Bay 3',NULL,NULL,NULL,'2026-06-27 15:20:40'),(4,'RACK-004','Harp',30,0,'in-use','Loading Dock',NULL,NULL,NULL,'2026-06-27 15:20:40'),(5,'RACK-005','A-frame',20,0,'in-transit','Customer Site',NULL,NULL,NULL,'2026-06-27 15:20:40');
/*!40000 ALTER TABLE `dispatch_racks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_routes`
--

DROP TABLE IF EXISTS `dispatch_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_name` varchar(255) DEFAULT NULL,
  `driver_name` varchar(255) DEFAULT NULL,
  `vehicle` varchar(100) DEFAULT NULL,
  `planned_date` date DEFAULT NULL,
  `status` enum('planning','scheduled','in-progress','completed','cancelled') DEFAULT 'planning',
  `total_stops` int DEFAULT '0',
  `total_distance` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_routes`
--

LOCK TABLES `dispatch_routes` WRITE;
/*!40000 ALTER TABLE `dispatch_routes` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispatch_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatch_stops`
--

DROP TABLE IF EXISTS `dispatch_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatch_stops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int DEFAULT NULL,
  `stop_order` int DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `address` text,
  `sales_order_id` int DEFAULT NULL,
  `rack_id` int DEFAULT NULL,
  `estimated_arrival` time DEFAULT NULL,
  `actual_arrival` time DEFAULT NULL,
  `status` enum('pending','arrived','delivered','failed') DEFAULT 'pending',
  `signature_url` varchar(500) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatch_stops`
--

LOCK TABLES `dispatch_stops` WRITE;
/*!40000 ALTER TABLE `dispatch_stops` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispatch_stops` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_attachments`
--

DROP TABLE IF EXISTS `document_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_attachments`
--

LOCK TABLES `document_attachments` WRITE;
/*!40000 ALTER TABLE `document_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_templates`
--

DROP TABLE IF EXISTS `document_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `doc_type` enum('quote','sales_order','invoice','packing_slip','bill_of_lading','purchase_order','work_order','receipt_label','shipping_label','product_label','check','statement') NOT NULL,
  `template_html` text,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_templates`
--

LOCK TABLES `document_templates` WRITE;
/*!40000 ALTER TABLE `document_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_versions`
--

DROP TABLE IF EXISTS `document_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_type` varchar(50) NOT NULL,
  `document_id` int NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `file_path` varchar(500) DEFAULT NULL,
  `file_size` int DEFAULT '0',
  `generated_by` int DEFAULT NULL,
  `generation_method` enum('manual','auto','batch','email') DEFAULT 'manual',
  `checksum` varchar(64) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_docver_type_id` (`document_type`,`document_id`),
  KEY `idx_docver_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_versions`
--

LOCK TABLES `document_versions` WRITE;
/*!40000 ALTER TABLE `document_versions` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_location_log`
--

DROP TABLE IF EXISTS `driver_location_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_location_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `driver_id` int NOT NULL,
  `route_id` int DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `speed_mph` decimal(5,1) DEFAULT NULL,
  `heading` decimal(5,1) DEFAULT NULL,
  `logged_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dll_driver` (`driver_id`),
  KEY `idx_dll_route` (`route_id`),
  KEY `idx_dll_time` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_location_log`
--

LOCK TABLES `driver_location_log` WRITE;
/*!40000 ALTER TABLE `driver_location_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_location_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_name` varchar(255) NOT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `license_expiry` date DEFAULT NULL,
  `license_class` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `max_hours_per_day` decimal(4,2) DEFAULT '10.00',
  `home_zip` varchar(20) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (1,'Carlos Rodriguez','DRV-001','(713) 555-0201','carlos@maxtagroup.com','TX12345678','2027-08-15','Class B',1,10.00,'77001',NULL,'2026-06-27 20:13:46'),(2,'James Wilson','DRV-002','(713) 555-0202','james.w@maxtagroup.com','TX87654321','2028-03-22','Class B',1,10.00,'77002',NULL,'2026-06-27 20:13:46'),(3,'David Chen','DRV-003','(713) 555-0203','david.c@maxtagroup.com','TX11223344','2027-11-30','Class A',1,10.00,'77003',NULL,'2026-06-27 20:13:46');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_log`
--

DROP TABLE IF EXISTS `email_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `body` text,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `status` enum('sent','failed','pending') DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_log`
--

LOCK TABLES `email_log` WRITE;
/*!40000 ALTER TABLE `email_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `body` text,
  `template_type` varchar(50) DEFAULT NULL,
  `variables` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_templates`
--

LOCK TABLES `email_templates` WRITE;
/*!40000 ALTER TABLE `email_templates` DISABLE KEYS */;
INSERT INTO `email_templates` VALUES (1,'Invoice Email','Invoice {{invoice_number}} from Max TA Group','<p>Dear {{customer_name}},</p><p>Please find attached invoice for {{amount}}. Due: {{due_date}}</p>','ar_invoice',NULL,1,'2026-06-27 15:20:40'),(2,'Order Confirmation','Order Confirmation - {{order_number}}','<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been confirmed.</p>','sales_order',NULL,1,'2026-06-27 15:20:40'),(3,'Shipment Notification','Your Order Has Shipped','<p>Dear {{customer_name}},</p><p>Your order {{order_number}} has been shipped.</p>','shipment',NULL,1,'2026-06-27 15:20:40'),(4,'Purchase Order','PO {{po_number}} - Max TA Group','<p>Dear {{vendor_name}},</p><p>Please find attached PO {{po_number}}.</p>','purchase_order',NULL,1,'2026-06-27 15:20:40');
/*!40000 ALTER TABLE `email_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_rates`
--

DROP TABLE IF EXISTS `exchange_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchange_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `from_currency` varchar(3) DEFAULT 'USD',
  `to_currency` varchar(3) NOT NULL,
  `rate` decimal(12,6) NOT NULL,
  `effective_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_rates`
--

LOCK TABLES `exchange_rates` WRITE;
/*!40000 ALTER TABLE `exchange_rates` DISABLE KEYS */;
INSERT INTO `exchange_rates` VALUES (1,'USD','CAD',1.360000,'2026-06-27','2026-06-27 20:13:45'),(2,'USD','EUR',0.920000,'2026-06-27','2026-06-27 20:13:45'),(3,'USD','GBP',0.790000,'2026-06-27','2026-06-27 20:13:45'),(4,'USD','MXN',17.200000,'2026-06-27','2026-06-27 20:13:45');
/*!40000 ALTER TABLE `exchange_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fabrication_charges`
--

DROP TABLE IF EXISTS `fabrication_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fabrication_charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) DEFAULT 'General',
  `pricing_method` varchar(50) DEFAULT 'per_piece',
  `default_rate` decimal(10,2) DEFAULT '0.00',
  `description` text,
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fabrication_charges`
--

LOCK TABLES `fabrication_charges` WRITE;
/*!40000 ALTER TABLE `fabrication_charges` DISABLE KEYS */;
INSERT INTO `fabrication_charges` VALUES (1,'Standard Hole','Holes','per_hole',8.50,NULL,1,'2026-06-27 18:08:08'),(2,'Oversized Hole','Holes','per_hole',15.00,NULL,1,'2026-06-27 18:08:08'),(3,'Notch','Cutouts','per_notch',25.00,NULL,1,'2026-06-27 18:08:08'),(4,'Rectangular Cutout','Cutouts','per_cutout',45.00,NULL,1,'2026-06-27 18:08:08'),(5,'Flat Polish','Edgework','per_linear_foot',4.50,NULL,1,'2026-06-27 18:08:08'),(6,'Pencil Polish','Edgework','per_linear_foot',3.75,NULL,1,'2026-06-27 18:08:08'),(7,'Beveled Edge','Edgework','per_linear_foot',8.00,NULL,1,'2026-06-27 18:08:08'),(8,'Tempering','Tempering','per_sq_ft',3.50,NULL,1,'2026-06-27 18:08:08'),(9,'Heat Soak','Heat Treatment','per_sq_ft',2.00,NULL,1,'2026-06-27 18:08:08'),(10,'Sandblasting','Coating','per_sq_ft',6.00,NULL,1,'2026-06-27 18:08:08'),(11,'Acid Etch','Coating','per_sq_ft',8.50,NULL,1,'2026-06-27 18:08:08'),(12,'Standard Temper','Tempering','per_sq_ft',3.50,NULL,1,'2026-06-27 18:09:13'),(13,'Standard Hinge Notch','Notches','per_notch',25.00,NULL,1,'2026-06-27 18:09:13'),(14,'Standard Cutout','Cutouts','per_cutout',45.00,NULL,1,'2026-06-27 18:09:13');
/*!40000 ALTER TABLE `fabrication_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `freight_costs`
--

DROP TABLE IF EXISTS `freight_costs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `freight_costs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int DEFAULT NULL,
  `shipment_id` int DEFAULT NULL,
  `cost_type` enum('fuel','labor','tolls','maintenance','insurance','other') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `cost_date` date NOT NULL,
  `vehicle_id` int DEFAULT NULL,
  `driver_id` int DEFAULT NULL,
  `miles_driven` decimal(8,2) DEFAULT NULL,
  `fuel_gallons` decimal(8,2) DEFAULT NULL,
  `fuel_price_per_gallon` decimal(5,3) DEFAULT NULL,
  `is_billable` tinyint(1) DEFAULT '1',
  `billed_to_customer` tinyint(1) DEFAULT '0',
  `invoice_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fc_route` (`route_id`),
  KEY `idx_fc_shipment` (`shipment_id`),
  KEY `idx_fc_date` (`cost_date`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `freight_costs`
--

LOCK TABLES `freight_costs` WRITE;
/*!40000 ALTER TABLE `freight_costs` DISABLE KEYS */;
INSERT INTO `freight_costs` VALUES (1,NULL,NULL,'fuel',85.50,'Diesel fill-up','2026-06-27',1,1,120.00,22.00,3.890,1,0,NULL,'2026-06-27 20:15:36'),(2,NULL,NULL,'fuel',85.50,'Diesel fill-up','2026-06-27',1,1,120.00,22.00,3.890,1,0,NULL,'2026-06-27 20:15:49');
/*!40000 ALTER TABLE `freight_costs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gl_accounts`
--

DROP TABLE IF EXISTS `gl_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gl_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense','cogs') NOT NULL,
  `sub_type` varchar(50) DEFAULT NULL,
  `parent_account_id` int DEFAULT NULL,
  `normal_balance` enum('debit','credit') NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `description` varchar(255) DEFAULT NULL,
  `current_balance` decimal(14,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_number` (`account_number`),
  KEY `parent_account_id` (`parent_account_id`),
  CONSTRAINT `gl_accounts_ibfk_1` FOREIGN KEY (`parent_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gl_accounts`
--

LOCK TABLES `gl_accounts` WRITE;
/*!40000 ALTER TABLE `gl_accounts` DISABLE KEYS */;
INSERT INTO `gl_accounts` VALUES (1,'1000','Cash - Operating','asset',NULL,NULL,'debit',1,NULL,0.00),(2,'1100','Accounts Receivable','asset',NULL,NULL,'debit',1,NULL,0.00),(3,'1200','Inventory - Raw Materials','asset',NULL,NULL,'debit',1,NULL,0.00),(4,'1210','Inventory - Work in Progress','asset',NULL,NULL,'debit',1,NULL,0.00),(5,'1220','Inventory - Finished Goods','asset',NULL,NULL,'debit',1,NULL,0.00),(6,'1500','Fixed Assets','asset',NULL,NULL,'debit',1,NULL,0.00),(7,'2000','Accounts Payable','liability',NULL,NULL,'credit',1,NULL,0.00),(8,'2100','Accrued Liabilities','liability',NULL,NULL,'credit',1,NULL,0.00),(9,'2200','Sales Tax Payable','liability',NULL,NULL,'credit',1,NULL,0.00),(10,'3000','Common Stock','equity',NULL,NULL,'credit',1,NULL,0.00),(11,'3100','Retained Earnings','equity',NULL,NULL,'credit',1,NULL,0.00),(12,'4000','Sales Revenue','revenue',NULL,NULL,'credit',1,NULL,0.00),(13,'4100','Freight Revenue','revenue',NULL,NULL,'credit',1,NULL,0.00),(14,'5000','Cost of Goods Sold','cogs',NULL,NULL,'debit',1,NULL,0.00),(15,'5010','Material Cost Variance','cogs',NULL,NULL,'debit',1,NULL,0.00),(16,'5020','Labor Cost Variance','cogs',NULL,NULL,'debit',1,NULL,0.00),(17,'5100','Direct Labor','cogs',NULL,NULL,'debit',1,NULL,0.00),(18,'5200','Manufacturing Overhead','cogs',NULL,NULL,'debit',1,NULL,0.00),(19,'6000','Salaries & Wages','expense',NULL,NULL,'debit',1,NULL,0.00),(20,'6100','Rent Expense','expense',NULL,NULL,'debit',1,NULL,0.00),(21,'6200','Utilities Expense','expense',NULL,NULL,'debit',1,NULL,0.00),(22,'6600','Shipping Expense','expense',NULL,NULL,'debit',1,NULL,0.00),(23,'6700','Commission Expense','expense',NULL,NULL,'debit',1,NULL,0.00);
/*!40000 ALTER TABLE `gl_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gl_budget`
--

DROP TABLE IF EXISTS `gl_budget`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gl_budget` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gl_account_id` int NOT NULL,
  `period_id` int NOT NULL,
  `budget_amount` decimal(14,2) DEFAULT '0.00',
  `actual_amount` decimal(14,2) DEFAULT '0.00',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `gl_account_id` (`gl_account_id`),
  KEY `period_id` (`period_id`),
  CONSTRAINT `gl_budget_ibfk_1` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`),
  CONSTRAINT `gl_budget_ibfk_2` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gl_budget`
--

LOCK TABLES `gl_budget` WRITE;
/*!40000 ALTER TABLE `gl_budget` DISABLE KEYS */;
/*!40000 ALTER TABLE `gl_budget` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_adjustments`
--

DROP TABLE IF EXISTS `inventory_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adjustment_number` varchar(20) NOT NULL,
  `item_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `adjustment_type` enum('increase','decrease','transfer') NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `reason_code` varchar(50) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `cost` decimal(12,4) DEFAULT NULL,
  `notes` text,
  `adjusted_by` int DEFAULT NULL,
  `adjustment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `adjustment_number` (`adjustment_number`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustments`
--

LOCK TABLES `inventory_adjustments` WRITE;
/*!40000 ALTER TABLE `inventory_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_pricing`
--

DROP TABLE IF EXISTS `item_pricing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_pricing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `price_list` varchar(50) DEFAULT 'Standard',
  `min_qty` decimal(12,4) DEFAULT '0.0000',
  `max_qty` decimal(12,4) DEFAULT '999999.0000',
  `unit_price` decimal(12,4) NOT NULL,
  `tier_type` enum('stock_sheet','half_sheet','custom_cut','standard') DEFAULT 'standard',
  `price_per_sqft` decimal(10,4) DEFAULT '0.0000',
  `minimum_charge` decimal(10,2) DEFAULT '0.00',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_pricing_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_pricing`
--

LOCK TABLES `item_pricing` WRITE;
/*!40000 ALTER TABLE `item_pricing` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_pricing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_types`
--

DROP TABLE IF EXISTS `item_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_types`
--

LOCK TABLES `item_types` WRITE;
/*!40000 ALTER TABLE `item_types` DISABLE KEYS */;
INSERT INTO `item_types` VALUES (1,'Raw Material','Raw materials purchased from vendors',1),(2,'Finished Good','Completed products ready for sale',1),(3,'Sub-Assembly','Intermediate assemblies used in production',1),(4,'Purchased Part','Parts bought and resold or used in assembly',1),(5,'Service','Non-inventory service items',1),(6,'Consumable','Items consumed in production but not tracked per unit',1);
/*!40000 ALTER TABLE `item_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_vendors`
--

DROP TABLE IF EXISTS `item_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `vendor_id` int DEFAULT NULL,
  `vendor_item_number` varchar(50) DEFAULT NULL,
  `vendor_description` varchar(255) DEFAULT NULL,
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `lead_time_days` int DEFAULT '0',
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `is_preferred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_vendors_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_vendors`
--

LOCK TABLES `item_vendors` WRITE;
/*!40000 ALTER TABLE `item_vendors` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_number` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `additional_info` varchar(255) DEFAULT NULL,
  `item_type_id` int DEFAULT NULL,
  `uom` varchar(20) NOT NULL DEFAULT 'Each',
  `is_purchased` tinyint(1) DEFAULT '0',
  `is_manufactured` tinyint(1) DEFAULT '0',
  `is_sold` tinyint(1) DEFAULT '0',
  `is_material` tinyint(1) DEFAULT '0',
  `lot_control` tinyint(1) DEFAULT '0',
  `serial_control` tinyint(1) DEFAULT '0',
  `is_taxable` tinyint(1) DEFAULT '1',
  `is_backorderable` tinyint(1) DEFAULT '1',
  `exempt_from_commission` tinyint(1) DEFAULT '0',
  `has_warranty` tinyint(1) DEFAULT '0',
  `is_hazardous` tinyint(1) DEFAULT '0',
  `is_suspended` tinyint(1) DEFAULT '0',
  `include_in_forecast` tinyint(1) DEFAULT '1',
  `standard_cost` decimal(12,4) DEFAULT '0.0000',
  `weighted_avg_cost` decimal(12,4) DEFAULT '0.0000',
  `last_cost` decimal(12,4) DEFAULT '0.0000',
  `qty_on_hand` decimal(12,4) DEFAULT '0.0000',
  `receipt_location_id` int DEFAULT NULL,
  `shipping_location_id` int DEFAULT NULL,
  `bin` varchar(20) DEFAULT NULL,
  `cycle_code` varchar(10) DEFAULT NULL,
  `item_group` varchar(50) DEFAULT NULL,
  `item_master_group` varchar(50) DEFAULT NULL,
  `min_order_qty` decimal(12,4) DEFAULT '1.0000',
  `minimum_qty` decimal(12,4) DEFAULT '1.0000',
  `lead_time_days` int DEFAULT '0',
  `production_days` int DEFAULT '0',
  `production_qty` decimal(12,4) DEFAULT '0.0000',
  `batch_size` decimal(12,4) DEFAULT '1.0000',
  `revision` varchar(20) DEFAULT NULL,
  `drawing_number` varchar(50) DEFAULT NULL,
  `unit_weight` decimal(10,4) DEFAULT '0.0000',
  `glass_type` enum('clear','low_e','tinted','frosted','mirror','laminated') DEFAULT NULL,
  `glass_thickness` varchar(10) DEFAULT NULL,
  `tempering_status` enum('annealed','tempered','heat_strengthened','laminated') DEFAULT NULL,
  `edge_type` enum('flat_polish','pencil_polish','beveled','seamed','raw') DEFAULT NULL,
  `pricing_method` enum('per_unit','per_sqft','per_linear_ft') DEFAULT 'per_unit',
  `custom_field_1` varchar(100) DEFAULT NULL,
  `custom_field_2` varchar(100) DEFAULT NULL,
  `custom_field_3` varchar(100) DEFAULT NULL,
  `custom_field_4` varchar(100) DEFAULT NULL,
  `custom_field_5` varchar(100) DEFAULT NULL,
  `notes` text,
  `internal_notes` text,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_number` (`item_number`),
  KEY `item_type_id` (`item_type_id`),
  KEY `receipt_location_id` (`receipt_location_id`),
  KEY `shipping_location_id` (`shipping_location_id`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`item_type_id`) REFERENCES `item_types` (`id`),
  CONSTRAINT `items_ibfk_2` FOREIGN KEY (`receipt_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `items_ibfk_3` FOREIGN KEY (`shipping_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'PVB-076','PVB Interlayer Film 0.76mm',NULL,6,'SqFt',1,0,0,1,0,0,1,1,0,0,0,0,1,2.5000,0.0000,0.0000,5000.0000,NULL,NULL,NULL,NULL,NULL,NULL,1.0000,1.0000,0,0,0.0000,1.0000,NULL,NULL,0.0000,NULL,NULL,NULL,NULL,'per_unit',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-06-27 18:05:52','2026-06-27 18:05:52');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_lines`
--

DROP TABLE IF EXISTS `journal_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucher_id` int NOT NULL,
  `line_number` int NOT NULL,
  `gl_account_id` int NOT NULL,
  `debit_amount` decimal(14,2) DEFAULT '0.00',
  `credit_amount` decimal(14,2) DEFAULT '0.00',
  `description` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `voucher_id` (`voucher_id`),
  KEY `gl_account_id` (`gl_account_id`),
  CONSTRAINT `journal_lines_ibfk_1` FOREIGN KEY (`voucher_id`) REFERENCES `journal_vouchers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `journal_lines_ibfk_2` FOREIGN KEY (`gl_account_id`) REFERENCES `gl_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_lines`
--

LOCK TABLES `journal_lines` WRITE;
/*!40000 ALTER TABLE `journal_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_vouchers`
--

DROP TABLE IF EXISTS `journal_vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucher_number` varchar(20) NOT NULL,
  `voucher_date` date NOT NULL,
  `period_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `memo` varchar(255) DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `source_reference` varchar(50) DEFAULT NULL,
  `total_debit` decimal(14,2) DEFAULT '0.00',
  `total_credit` decimal(14,2) DEFAULT '0.00',
  `total_debit_amt` decimal(14,2) DEFAULT '0.00',
  `total_credit_amt` decimal(14,2) DEFAULT '0.00',
  `status` enum('draft','posted','reversed') DEFAULT 'draft',
  `posted_date` datetime DEFAULT NULL,
  `posted_by` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_number` (`voucher_number`),
  KEY `period_id` (`period_id`),
  CONSTRAINT `journal_vouchers_ibfk_1` FOREIGN KEY (`period_id`) REFERENCES `accounting_periods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_vouchers`
--

LOCK TABLES `journal_vouchers` WRITE;
/*!40000 ALTER TABLE `journal_vouchers` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_vouchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kiosk_sessions`
--

DROP TABLE IF EXISTS `kiosk_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kiosk_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `station_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action_type` varchar(50) DEFAULT NULL,
  `action_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `station_id` (`station_id`),
  CONSTRAINT `kiosk_sessions_ibfk_1` FOREIGN KEY (`station_id`) REFERENCES `kiosk_stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kiosk_sessions`
--

LOCK TABLES `kiosk_sessions` WRITE;
/*!40000 ALTER TABLE `kiosk_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `kiosk_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kiosk_stations`
--

DROP TABLE IF EXISTS `kiosk_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kiosk_stations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `station_name` varchar(100) NOT NULL,
  `station_code` varchar(20) NOT NULL,
  `work_center_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL,
  `allowed_actions` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_heartbeat` timestamp NULL DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `config` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `station_code` (`station_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kiosk_stations`
--

LOCK TABLES `kiosk_stations` WRITE;
/*!40000 ALTER TABLE `kiosk_stations` DISABLE KEYS */;
INSERT INTO `kiosk_stations` VALUES (1,'Cutting Table 1','CUT-01',1,NULL,'1234','[\"scan_wo\", \"log_production\", \"report_issue\"]',1,NULL,'2026-06-29 14:12:45','{\"theme\": \"dark\", \"timeout\": 120}'),(2,'Tempering Oven','TEMP-01',2,NULL,'1234','[\"scan_wo\", \"log_production\", \"clock_in\", \"clock_out\"]',1,NULL,'2026-06-29 14:12:45','{\"theme\": \"dark\", \"timeout\": 120}'),(3,'Lamination Station','LAMI-01',3,NULL,'1234','[\"scan_wo\", \"log_production\", \"report_issue\", \"quality_check\"]',1,NULL,'2026-06-29 14:12:45','{\"theme\": \"dark\", \"timeout\": 120}'),(4,'Shipping Dock','SHIP-01',NULL,NULL,'1234','[\"scan_shipment\", \"verify_packing\", \"log_dispatch\"]',1,NULL,'2026-06-29 14:12:45','{\"theme\": \"dark\", \"timeout\": 180}'),(5,'Receiving Bay','RECV-01',NULL,NULL,'1234','[\"scan_po\", \"receive_item\", \"inspect_quality\"]',1,NULL,'2026-06-29 14:12:45','{\"theme\": \"dark\", \"timeout\": 180}');
/*!40000 ALTER TABLE `kiosk_stations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpi_snapshots`
--

DROP TABLE IF EXISTS `kpi_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpi_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `snapshot_date` date NOT NULL,
  `kpi_key` varchar(100) NOT NULL,
  `kpi_value` decimal(14,2) NOT NULL,
  `kpi_metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpi_date` (`kpi_key`,`snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpi_snapshots`
--

LOCK TABLES `kpi_snapshots` WRITE;
/*!40000 ALTER TABLE `kpi_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpi_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `label_configurations`
--

DROP TABLE IF EXISTS `label_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `label_type` enum('product','shipping','receipt','barcode','rack','station') NOT NULL,
  `name` varchar(100) NOT NULL,
  `width_inches` decimal(5,2) NOT NULL,
  `height_inches` decimal(5,2) NOT NULL,
  `barcode_format` enum('code128','code39','qr','ean13','upc') DEFAULT 'code128',
  `template_html` text,
  `fields_json` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `label_configurations`
--

LOCK TABLES `label_configurations` WRITE;
/*!40000 ALTER TABLE `label_configurations` DISABLE KEYS */;
/*!40000 ALTER TABLE `label_configurations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_batch_items`
--

DROP TABLE IF EXISTS `lami_autoclave_batch_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_batch_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `work_order_id` int NOT NULL,
  `layup_record_id` int DEFAULT NULL,
  `position_in_batch` int DEFAULT NULL,
  `width_mm` decimal(8,2) DEFAULT NULL,
  `height_mm` decimal(8,2) DEFAULT NULL,
  `total_thickness_mm` decimal(6,2) DEFAULT NULL,
  `sqm` decimal(8,4) DEFAULT NULL,
  `status` enum('loaded','in_cycle','completed','failed','removed') DEFAULT 'loaded',
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_batch_items`
--

LOCK TABLES `lami_autoclave_batch_items` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_batch_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_autoclave_batch_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_batches`
--

DROP TABLE IF EXISTS `lami_autoclave_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_number` varchar(50) NOT NULL,
  `recipe_id` int NOT NULL,
  `interlayer_type` varchar(50) DEFAULT NULL,
  `status` enum('loading','loaded','in_cycle','cooling','completed','failed') DEFAULT 'loading',
  `planned_start` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `total_pieces` int DEFAULT '0',
  `total_sqm` decimal(10,2) DEFAULT '0.00',
  `actual_temp_max` decimal(5,1) DEFAULT NULL,
  `actual_pressure_max` decimal(5,2) DEFAULT NULL,
  `qc_passed` tinyint(1) DEFAULT NULL,
  `qc_notes` text,
  `operator_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_number` (`batch_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_batches`
--

LOCK TABLES `lami_autoclave_batches` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_autoclave_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_autoclave_recipes`
--

DROP TABLE IF EXISTS `lami_autoclave_recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_autoclave_recipes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipe_name` varchar(255) NOT NULL,
  `recipe_code` varchar(50) NOT NULL,
  `interlayer_type` enum('PVB','SGP','EVA','TPU','Acoustic_PVB') NOT NULL,
  `min_thickness_mm` decimal(6,2) DEFAULT NULL,
  `max_thickness_mm` decimal(6,2) DEFAULT NULL,
  `ramp_rate_c_per_min` decimal(4,2) DEFAULT '1.50',
  `target_temperature_c` decimal(5,1) NOT NULL,
  `soak_time_min` int NOT NULL,
  `max_pressure_bar` decimal(5,2) NOT NULL,
  `cooling_rate_c_per_min` decimal(4,2) DEFAULT '2.00',
  `total_cycle_hours` decimal(4,1) NOT NULL,
  `vacuum_required` tinyint(1) DEFAULT '0',
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recipe_code` (`recipe_code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_autoclave_recipes`
--

LOCK TABLES `lami_autoclave_recipes` WRITE;
/*!40000 ALTER TABLE `lami_autoclave_recipes` DISABLE KEYS */;
INSERT INTO `lami_autoclave_recipes` VALUES (1,'PVB Standard','PVB-STD','PVB',6.00,20.00,1.50,135.0,60,12.00,2.00,3.5,0,'Standard PVB cycle for 6-20mm total thickness',1,'2026-06-27 15:20:40'),(2,'PVB Thick','PVB-THK','PVB',20.00,50.00,1.00,140.0,90,14.00,1.50,5.0,0,'Extended cycle for thick laminated assemblies',1,'2026-06-27 15:20:40'),(3,'SGP Standard','SGP-STD','SGP',6.00,30.00,2.00,135.0,45,12.50,2.00,3.0,0,'Standard SGP/SentryGlas cycle',1,'2026-06-27 15:20:40'),(4,'EVA Standard','EVA-STD','EVA',4.00,20.00,1.50,110.0,30,0.00,2.00,2.0,1,'EVA vacuum-only process - no pressure',1,'2026-06-27 15:20:40'),(5,'Acoustic PVB','PVB-ACO','Acoustic_PVB',8.00,30.00,1.20,130.0,75,12.00,1.80,4.0,0,'Acoustic PVB requires lower temp and longer soak',1,'2026-06-27 15:20:40');
/*!40000 ALTER TABLE `lami_autoclave_recipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_bom_lines`
--

DROP TABLE IF EXISTS `lami_bom_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_bom_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `sequence` int DEFAULT '10',
  `component_type` enum('glass_lite','interlayer','hardware','consumable','other') NOT NULL,
  `component_item_id` int DEFAULT NULL,
  `quantity_per` decimal(8,2) DEFAULT '1.00',
  `width_mm` decimal(8,2) DEFAULT NULL,
  `height_mm` decimal(8,2) DEFAULT NULL,
  `thickness_mm` decimal(6,2) DEFAULT NULL,
  `overhang_mm` decimal(6,2) DEFAULT '0.00',
  `uom` varchar(20) DEFAULT 'EA',
  `consumed_at_operation` int DEFAULT NULL,
  `notes` text,
  `child_wo_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_bom_lines`
--

LOCK TABLES `lami_bom_lines` WRITE;
/*!40000 ALTER TABLE `lami_bom_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_bom_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_cleanroom_sessions`
--

DROP TABLE IF EXISTS `lami_cleanroom_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_cleanroom_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_number` varchar(50) NOT NULL,
  `operator_id` int DEFAULT NULL,
  `temperature_c` decimal(4,1) DEFAULT NULL,
  `humidity_percent` decimal(4,1) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('active','completed','aborted') DEFAULT 'active',
  `total_layups` int DEFAULT '0',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_number` (`session_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_cleanroom_sessions`
--

LOCK TABLES `lami_cleanroom_sessions` WRITE;
/*!40000 ALTER TABLE `lami_cleanroom_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_cleanroom_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_cut_plan_items`
--

DROP TABLE IF EXISTS `lami_interlayer_cut_plan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_cut_plan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `sequence` int DEFAULT NULL,
  `cut_width_mm` decimal(8,2) NOT NULL,
  `cut_length_mm` decimal(8,2) NOT NULL,
  `position_on_roll_m` decimal(8,2) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_cut_plan_items`
--

LOCK TABLES `lami_interlayer_cut_plan_items` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_cut_plan_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_interlayer_cut_plan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_cut_plans`
--

DROP TABLE IF EXISTS `lami_interlayer_cut_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_cut_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_number` varchar(50) NOT NULL,
  `roll_id` int NOT NULL,
  `total_pieces` int DEFAULT '0',
  `total_length_used_m` decimal(8,2) DEFAULT '0.00',
  `waste_length_m` decimal(8,2) DEFAULT '0.00',
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `status` enum('planned','in_progress','completed','cancelled') DEFAULT 'planned',
  `created_by` int DEFAULT NULL,
  `executed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plan_number` (`plan_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_cut_plans`
--

LOCK TABLES `lami_interlayer_cut_plans` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_cut_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_interlayer_cut_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_interlayer_rolls`
--

DROP TABLE IF EXISTS `lami_interlayer_rolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_interlayer_rolls` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roll_number` varchar(50) NOT NULL,
  `material_type` enum('PVB','SGP','EVA','TPU','Acoustic_PVB','Colored_PVB','SentryGlas') NOT NULL,
  `thickness_mm` decimal(6,2) NOT NULL,
  `width_mm` decimal(8,2) NOT NULL,
  `original_length_m` decimal(8,2) NOT NULL,
  `current_length_m` decimal(8,2) NOT NULL,
  `lot_number` varchar(100) NOT NULL,
  `manufacturer` varchar(255) DEFAULT NULL,
  `color` varchar(100) DEFAULT 'Clear',
  `received_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `cost_per_sqm` decimal(10,2) DEFAULT NULL,
  `status` enum('sealed','in_use','exhausted','expired','quarantine') DEFAULT 'sealed',
  `location` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roll_number` (`roll_number`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_interlayer_rolls`
--

LOCK TABLES `lami_interlayer_rolls` WRITE;
/*!40000 ALTER TABLE `lami_interlayer_rolls` DISABLE KEYS */;
INSERT INTO `lami_interlayer_rolls` VALUES (1,'PVB-R001','PVB',0.76,2500.00,100.00,78.50,'LOT-2024-A1','Eastman','Clear','2024-06-01','2026-06-01',8.50,'in_use',NULL,NULL,'2026-06-27 15:20:40','2026-06-27 15:20:40'),(2,'PVB-R002','PVB',1.52,2500.00,100.00,100.00,'LOT-2024-A2','Eastman','Clear','2024-06-15','2026-06-15',14.00,'sealed',NULL,NULL,'2026-06-27 15:20:40','2026-06-27 15:20:40'),(3,'SGP-R001','SGP',1.52,1830.00,50.00,42.30,'LOT-2024-B1','Kuraray','Clear','2024-05-01','2026-05-01',45.00,'in_use',NULL,NULL,'2026-06-27 15:20:40','2026-06-27 15:20:40'),(4,'EVA-R001','EVA',0.76,2100.00,80.00,80.00,'LOT-2024-C1','Bridgestone','Clear','2024-07-01','2026-07-01',6.00,'sealed',NULL,NULL,'2026-06-27 15:20:40','2026-06-27 15:20:40'),(5,'PVB-R003','Acoustic_PVB',0.76,2500.00,100.00,65.20,'LOT-2024-D1','Eastman','Clear','2024-04-01','2025-10-01',12.50,'in_use',NULL,NULL,'2026-06-27 15:20:40','2026-06-27 15:20:40');
/*!40000 ALTER TABLE `lami_interlayer_rolls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lami_layup_records`
--

DROP TABLE IF EXISTS `lami_layup_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lami_layup_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `cleanroom_session_id` int DEFAULT NULL,
  `roll_id` int DEFAULT NULL,
  `interlayer_lot_number` varchar(100) DEFAULT NULL,
  `interlayer_width_mm` decimal(8,2) DEFAULT NULL,
  `interlayer_length_mm` decimal(8,2) DEFAULT NULL,
  `temperature_c` decimal(4,1) DEFAULT NULL,
  `humidity_percent` decimal(4,1) DEFAULT NULL,
  `pre_press_method` enum('nip_roller','vacuum_bag','none') DEFAULT 'nip_roller',
  `status` enum('layup_complete','pre_pressed','ready_for_autoclave','in_autoclave','completed','failed') DEFAULT 'layup_complete',
  `operator_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lami_layup_records`
--

LOCK TABLES `lami_layup_records` WRITE;
/*!40000 ALTER TABLE `lami_layup_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `lami_layup_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location_group` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lots`
--

DROP TABLE IF EXISTS `lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lot_number` varchar(50) NOT NULL,
  `item_id` int NOT NULL,
  `quantity` decimal(12,4) DEFAULT '0.0000',
  `location_id` int DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `supplier_lot_number` varchar(50) DEFAULT NULL,
  `status` enum('available','on_hold','quarantine','expired') DEFAULT 'available',
  `received_date` date DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `lots_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `lots_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lots`
--

LOCK TABLES `lots` WRITE;
/*!40000 ALTER TABLE `lots` DISABLE KEYS */;
/*!40000 ALTER TABLE `lots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_downtime`
--

DROP TABLE IF EXISTS `machine_downtime`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_downtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `downtime_start` datetime NOT NULL,
  `downtime_end` datetime DEFAULT NULL,
  `duration_minutes` decimal(8,2) DEFAULT NULL,
  `reason_code` enum('breakdown','maintenance','changeover','material_wait','operator_wait','quality_hold','power_outage','other') NOT NULL,
  `reason_detail` text,
  `reported_by` int DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  `resolution_notes` text,
  `is_planned` tinyint(1) DEFAULT '0',
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dt_wc` (`work_center_id`),
  KEY `idx_dt_date` (`downtime_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_downtime`
--

LOCK TABLES `machine_downtime` WRITE;
/*!40000 ALTER TABLE `machine_downtime` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_downtime` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `machine_utilization_log`
--

DROP TABLE IF EXISTS `machine_utilization_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_utilization_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `log_date` date NOT NULL,
  `shift` enum('day','evening','night') DEFAULT 'day',
  `available_hours` decimal(5,2) DEFAULT '8.00',
  `productive_hours` decimal(5,2) DEFAULT '0.00',
  `setup_hours` decimal(5,2) DEFAULT '0.00',
  `idle_hours` decimal(5,2) DEFAULT '0.00',
  `downtime_hours` decimal(5,2) DEFAULT '0.00',
  `total_pieces_produced` int DEFAULT '0',
  `total_sqft_produced` decimal(10,2) DEFAULT '0.00',
  `scrap_pieces` int DEFAULT '0',
  `efficiency_percent` decimal(5,2) DEFAULT '0.00',
  `oee_percent` decimal(5,2) DEFAULT '0.00',
  `operator_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_util_wc_date` (`work_center_id`,`log_date`),
  KEY `idx_util_date` (`log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `machine_utilization_log`
--

LOCK TABLES `machine_utilization_log` WRITE;
/*!40000 ALTER TABLE `machine_utilization_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `machine_utilization_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `category` varchar(50) NOT NULL,
  `push_enabled` tinyint(1) DEFAULT '1',
  `in_app_enabled` tinyint(1) DEFAULT '1',
  `email_enabled` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_cat` (`user_id`,`category`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_preferences`
--

LOCK TABLES `notification_preferences` WRITE;
/*!40000 ALTER TABLE `notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_rules`
--

DROP TABLE IF EXISTS `notification_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(255) DEFAULT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `condition_field` varchar(100) DEFAULT NULL,
  `condition_operator` varchar(20) DEFAULT NULL,
  `condition_value` varchar(255) DEFAULT NULL,
  `action_type` enum('in-app','email','sms','webhook') DEFAULT 'in-app',
  `recipients` text,
  `message_template` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_rules`
--

LOCK TABLES `notification_rules` WRITE;
/*!40000 ALTER TABLE `notification_rules` DISABLE KEYS */;
INSERT INTO `notification_rules` VALUES (1,'Low Stock Alert','inventory_change','quantity_on_hand','less_than','reorder_point','in-app',NULL,'Item {{item_name}} is below reorder point',1,'2026-06-27 15:20:40'),(2,'Overdue Invoice','daily_check','due_date','less_than','today','email',NULL,'Invoice {{invoice_number}} is overdue',1,'2026-06-27 15:20:40'),(3,'WO Deadline Warning','daily_check','due_date','within_days','2','in-app',NULL,'Work Order {{wo_number}} is due soon',1,'2026-06-27 15:20:40'),(4,'New Order Received','order_created','status','equals','new','in-app',NULL,'New order received from {{customer_name}}',1,'2026-06-27 15:20:40'),(5,'Payment Received','payment_received','amount','greater_than','0','in-app',NULL,'Payment received for invoice {{invoice_number}}',1,'2026-06-27 15:20:40');
/*!40000 ALTER TABLE `notification_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text,
  `type` varchar(50) DEFAULT 'info',
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_dismissed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offline_sync_queue`
--

DROP TABLE IF EXISTS `offline_sync_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offline_sync_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(100) DEFAULT NULL,
  `action_type` varchar(50) NOT NULL,
  `payload` json NOT NULL,
  `status` enum('pending','synced','failed','conflict') DEFAULT 'pending',
  `error_message` text,
  `queued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `synced_at` timestamp NULL DEFAULT NULL,
  `retry_count` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `offline_sync_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offline_sync_queue`
--

LOCK TABLES `offline_sync_queue` WRITE;
/*!40000 ALTER TABLE `offline_sync_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `offline_sync_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_applications`
--

DROP TABLE IF EXISTS `payment_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `amount_applied` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `payment_applications_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `customer_payments` (`id`),
  CONSTRAINT `payment_applications_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `ar_invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_applications`
--

LOCK TABLES `payment_applications` WRITE;
/*!40000 ALTER TABLE `payment_applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `physical_count_lines`
--

DROP TABLE IF EXISTS `physical_count_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `physical_count_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `count_id` int NOT NULL,
  `item_id` int NOT NULL,
  `location_id` int DEFAULT NULL,
  `system_qty` decimal(12,4) DEFAULT '0.0000',
  `counted_qty` decimal(12,4) DEFAULT '0.0000',
  `variance_qty` decimal(12,4) DEFAULT '0.0000',
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `count_id` (`count_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `physical_count_lines_ibfk_1` FOREIGN KEY (`count_id`) REFERENCES `physical_counts` (`id`),
  CONSTRAINT `physical_count_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `physical_count_lines`
--

LOCK TABLES `physical_count_lines` WRITE;
/*!40000 ALTER TABLE `physical_count_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `physical_count_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `physical_counts`
--

DROP TABLE IF EXISTS `physical_counts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `physical_counts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `count_number` varchar(20) NOT NULL,
  `count_date` date NOT NULL,
  `location_id` int DEFAULT NULL,
  `status` enum('draft','in_progress','completed','posted') DEFAULT 'draft',
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `count_number` (`count_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `physical_counts`
--

LOCK TABLES `physical_counts` WRITE;
/*!40000 ALTER TABLE `physical_counts` DISABLE KEYS */;
/*!40000 ALTER TABLE `physical_counts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_lines`
--

DROP TABLE IF EXISTS `po_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_ordered` decimal(12,4) NOT NULL,
  `quantity_received` decimal(12,4) DEFAULT '0.0000',
  `uom` varchar(20) DEFAULT NULL,
  `unit_cost` decimal(12,4) NOT NULL,
  `line_total` decimal(12,2) DEFAULT '0.00',
  `required_date` date DEFAULT NULL,
  `status` enum('open','partial','complete','cancelled') DEFAULT 'open',
  `gl_account` varchar(20) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `idx_pol_po` (`purchase_order_id`),
  CONSTRAINT `po_lines_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `po_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_lines`
--

LOCK TABLES `po_lines` WRITE;
/*!40000 ALTER TABLE `po_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `po_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_receipt_lines`
--

DROP TABLE IF EXISTS `po_receipt_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_receipt_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_id` int NOT NULL,
  `po_line_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity_received` decimal(12,4) NOT NULL,
  `quantity_rejected` decimal(12,4) DEFAULT '0.0000',
  `unit_cost` decimal(12,4) DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `receipt_id` (`receipt_id`),
  KEY `po_line_id` (`po_line_id`),
  KEY `item_id` (`item_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `po_receipt_lines_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `po_receipts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `po_receipt_lines_ibfk_2` FOREIGN KEY (`po_line_id`) REFERENCES `po_lines` (`id`),
  CONSTRAINT `po_receipt_lines_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `po_receipt_lines_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_receipt_lines`
--

LOCK TABLES `po_receipt_lines` WRITE;
/*!40000 ALTER TABLE `po_receipt_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `po_receipt_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `po_receipts`
--

DROP TABLE IF EXISTS `po_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `po_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(20) NOT NULL,
  `purchase_order_id` int NOT NULL,
  `vendor_id` int NOT NULL,
  `receipt_date` date NOT NULL,
  `packing_slip_number` varchar(50) DEFAULT NULL,
  `status` enum('draft','received','posted') DEFAULT 'draft',
  `notes` text,
  `received_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `vendor_id` (`vendor_id`),
  CONSTRAINT `po_receipts_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `po_receipts_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `po_receipts`
--

LOCK TABLES `po_receipts` WRITE;
/*!40000 ALTER TABLE `po_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `po_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_lists`
--

DROP TABLE IF EXISTS `price_lists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_lists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `markup_percent` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_lists`
--

LOCK TABLES `price_lists` WRITE;
/*!40000 ALTER TABLE `price_lists` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_lists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_matrix`
--

DROP TABLE IF EXISTS `pricing_matrix`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_matrix` (
  `id` int NOT NULL AUTO_INCREMENT,
  `glass_type` varchar(100) NOT NULL,
  `thickness` varchar(50) NOT NULL,
  `price_per_sqft` decimal(10,2) NOT NULL,
  `min_sqft` decimal(10,2) DEFAULT '3.00',
  `min_charge` decimal(10,2) DEFAULT '0.00',
  `markup_percent` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_glass_thick` (`glass_type`,`thickness`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_matrix`
--

LOCK TABLES `pricing_matrix` WRITE;
/*!40000 ALTER TABLE `pricing_matrix` DISABLE KEYS */;
INSERT INTO `pricing_matrix` VALUES (1,'Clear Float','1/4\"',8.50,3.00,25.50,0.00,1,'2026-06-27 18:07:44'),(2,'Clear Float','3/8\"',12.00,3.00,36.00,0.00,1,'2026-06-27 18:07:44'),(3,'Clear Float','1/2\"',16.50,3.00,49.50,0.00,1,'2026-06-27 18:07:44'),(4,'Clear Float','3/4\"',24.00,3.00,72.00,0.00,1,'2026-06-27 18:07:44'),(5,'Low-E','1/4\"',14.00,3.00,42.00,0.00,1,'2026-06-27 18:07:44'),(6,'Low-E','3/8\"',18.50,3.00,55.50,0.00,1,'2026-06-27 18:07:44'),(7,'Low-E','1/2\"',24.00,3.00,72.00,0.00,1,'2026-06-27 18:07:44'),(8,'Tinted Grey','1/4\"',10.50,3.00,31.50,0.00,1,'2026-06-27 18:07:44'),(9,'Tinted Grey','3/8\"',14.50,3.00,43.50,0.00,1,'2026-06-27 18:07:44'),(10,'Tinted Bronze','1/4\"',10.50,3.00,31.50,0.00,1,'2026-06-27 18:07:44'),(11,'Starphire','1/4\"',16.00,3.00,48.00,0.00,1,'2026-06-27 18:07:44'),(12,'Starphire','3/8\"',22.00,3.00,66.00,0.00,1,'2026-06-27 18:07:44'),(13,'Starphire','1/2\"',28.00,3.00,84.00,0.00,1,'2026-06-27 18:07:44'),(14,'Frosted','1/4\"',12.00,3.00,36.00,0.00,1,'2026-06-27 18:07:44'),(15,'Frosted','3/8\"',16.00,3.00,48.00,0.00,1,'2026-06-27 18:07:44');
/*!40000 ALTER TABLE `pricing_matrix` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_kpis`
--

DROP TABLE IF EXISTS `production_kpis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_kpis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpi_date` date NOT NULL,
  `shift` enum('day','evening','night','all') DEFAULT 'all',
  `total_wo_started` int DEFAULT '0',
  `total_wo_completed` int DEFAULT '0',
  `total_pieces_produced` int DEFAULT '0',
  `total_sqft_produced` decimal(12,2) DEFAULT '0.00',
  `total_scrap_pieces` int DEFAULT '0',
  `scrap_rate_percent` decimal(5,2) DEFAULT '0.00',
  `avg_cycle_time_minutes` decimal(8,2) DEFAULT '0.00',
  `on_time_delivery_percent` decimal(5,2) DEFAULT '0.00',
  `avg_oee_percent` decimal(5,2) DEFAULT '0.00',
  `labor_hours` decimal(8,2) DEFAULT '0.00',
  `revenue_produced` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_kpi_date_shift` (`kpi_date`,`shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_kpis`
--

LOCK TABLES `production_kpis` WRITE;
/*!40000 ALTER TABLE `production_kpis` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_kpis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion_interactions`
--

DROP TABLE IF EXISTS `promotion_interactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_interactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `promotion_id` int NOT NULL,
  `user_id` int NOT NULL,
  `interaction_type` enum('view','dismiss','click','close') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promo_user` (`promotion_id`,`user_id`),
  KEY `idx_user_interactions` (`user_id`,`interaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_interactions`
--

LOCK TABLES `promotion_interactions` WRITE;
/*!40000 ALTER TABLE `promotion_interactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_interactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `promo_type` enum('announcement','promotion','alert','maintenance','feature') DEFAULT 'announcement',
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `display_type` enum('banner','modal','toast','sidebar') DEFAULT 'banner',
  `target_roles` json DEFAULT NULL COMMENT 'Array of role names to target, null=all',
  `target_departments` json DEFAULT NULL COMMENT 'Array of department codes, null=all',
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_dismissible` tinyint(1) DEFAULT '1',
  `action_url` varchar(500) DEFAULT NULL COMMENT 'Optional link/route for CTA button',
  `action_label` varchar(100) DEFAULT NULL COMMENT 'CTA button text',
  `bg_color` varchar(20) DEFAULT '#3b82f6',
  `icon` varchar(50) DEFAULT 'info',
  `view_count` int DEFAULT '0',
  `dismiss_count` int DEFAULT '0',
  `click_count` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
INSERT INTO `promotions` VALUES (1,'System Update Scheduled','ERP system maintenance window: Saturday 10PM-2AM EST. Please save all work before 10PM.','maintenance','high','banner',NULL,NULL,'2026-06-29 14:12:45','2026-07-06 14:12:45',1,1,NULL,NULL,'#f59e0b','warning',0,0,0,1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(2,'New Feature: Financial Dashboard','The advanced Financial Dashboard is now available! Track budgets, cash flow, and tax reporting in real-time.','feature','normal','modal',NULL,NULL,'2026-06-29 14:12:45','2026-07-29 14:12:45',1,1,'/accounting/financial-dashboard','Try It Now','#3b82f6','info',0,0,0,1,'2026-06-29 14:12:45','2026-06-29 14:12:45'),(3,'Q3 Sales Target','Q3 sales target: $500K. Current progress: $125K (25%). Keep pushing team!','promotion','normal','sidebar','[\"sales\", \"manager\", \"admin\"]',NULL,'2026-06-29 14:12:45','2026-09-27 14:12:45',1,1,'/sales','View Sales','#10b981','chart',0,0,0,1,'2026-06-29 14:12:45','2026-06-29 14:12:45');
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_number` varchar(20) NOT NULL,
  `vendor_id` int NOT NULL,
  `po_type` enum('standard','blanket','buyout','supporting') DEFAULT 'standard',
  `order_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `promised_date` date DEFAULT NULL,
  `status` enum('draft','open','partial','complete','closed','cancelled') DEFAULT 'draft',
  `work_order_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `ship_to_location_id` int DEFAULT NULL,
  `fob` varchar(50) DEFAULT NULL,
  `ship_via` varchar(50) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `created_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `po_printed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `vendor_id` (`vendor_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `ship_to_location_id` (`ship_to_location_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `purchase_orders_ibfk_4` FOREIGN KEY (`ship_to_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_subscriptions`
--

DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(500) DEFAULT NULL,
  `auth_key` varchar(255) DEFAULT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_type` enum('desktop','mobile','tablet') DEFAULT 'desktop',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `push_subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_subscriptions`
--

LOCK TABLES `push_subscriptions` WRITE;
/*!40000 ALTER TABLE `push_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `push_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qc_checkpoint_results`
--

DROP TABLE IF EXISTS `qc_checkpoint_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_checkpoint_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `wo_routing_id` int NOT NULL,
  `checkpoint_id` int NOT NULL,
  `inspector_id` int DEFAULT NULL,
  `result` enum('pass','fail','conditional','na') NOT NULL,
  `measured_value` decimal(12,4) DEFAULT NULL,
  `notes` text,
  `defect_photo_url` varchar(500) DEFAULT NULL,
  `inspected_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qcr_wo` (`work_order_id`),
  KEY `idx_qcr_routing` (`wo_routing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qc_checkpoint_results`
--

LOCK TABLES `qc_checkpoint_results` WRITE;
/*!40000 ALTER TABLE `qc_checkpoint_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `qc_checkpoint_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qc_checkpoints`
--

DROP TABLE IF EXISTS `qc_checkpoints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_checkpoints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `checkpoint_name` varchar(255) NOT NULL,
  `checkpoint_code` varchar(50) DEFAULT NULL,
  `inspection_type` enum('visual','measurement','functional','documentation') DEFAULT 'visual',
  `measurement_type` enum('pass_fail','numeric','range','text') DEFAULT 'pass_fail',
  `target_value` decimal(12,4) DEFAULT NULL,
  `min_value` decimal(12,4) DEFAULT NULL,
  `max_value` decimal(12,4) DEFAULT NULL,
  `unit_of_measure` varchar(30) DEFAULT NULL,
  `is_critical` tinyint(1) DEFAULT '0',
  `sequence` int DEFAULT '10',
  `instructions` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qc_cp_wc` (`work_center_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qc_checkpoints`
--

LOCK TABLES `qc_checkpoints` WRITE;
/*!40000 ALTER TABLE `qc_checkpoints` DISABLE KEYS */;
INSERT INTO `qc_checkpoints` VALUES (1,1,'Cut Size Accuracy','CUT-001','measurement','range',NULL,-0.5000,0.5000,'mm',1,10,'Measure cut dimensions vs spec. Tolerance +/- 0.5mm',1,'2026-06-27 20:13:46'),(2,1,'Edge Chip Check','CUT-002','visual','pass_fail',NULL,NULL,NULL,NULL,1,20,'Inspect all edges for chips > 1mm',1,'2026-06-27 20:13:46'),(3,1,'Glass Clarity','CUT-003','visual','pass_fail',NULL,NULL,NULL,NULL,0,30,'Check for scratches, inclusions, or distortion',1,'2026-06-27 20:13:46'),(4,2,'Edge Finish Quality','EDGE-001','visual','pass_fail',NULL,NULL,NULL,NULL,1,10,'Inspect polished edges for uniformity and smoothness',1,'2026-06-27 20:13:46'),(5,2,'Edge Straightness','EDGE-002','measurement','range',NULL,-0.3000,0.3000,'mm',1,20,'Check edge straightness with straight edge',1,'2026-06-27 20:13:46'),(6,3,'Hole Position Accuracy','CNC-001','measurement','range',NULL,-0.5000,0.5000,'mm',1,10,'Verify hole positions match drawing',1,'2026-06-27 20:13:46'),(7,3,'Hole Diameter','CNC-002','measurement','range',NULL,-0.2000,0.2000,'mm',1,20,'Measure hole diameters with calipers',1,'2026-06-27 20:13:46'),(8,3,'Cutout Dimensions','CNC-003','measurement','range',NULL,-0.5000,0.5000,'mm',0,30,'Verify cutout dimensions match spec',1,'2026-06-27 20:13:46'),(9,5,'Wash Cleanliness','WASH-001','visual','pass_fail',NULL,NULL,NULL,NULL,1,10,'Inspect for water spots, residue, or contamination',1,'2026-06-27 20:13:46'),(10,6,'Temper Stress Pattern','TEMP-001','visual','pass_fail',NULL,NULL,NULL,NULL,1,10,'Check stress pattern with polarized light',1,'2026-06-27 20:13:46'),(11,6,'Flatness Check','TEMP-002','measurement','range',NULL,0.0000,3.0000,'mm/m',1,20,'Measure bow/warp with straight edge. Max 3mm/m',1,'2026-06-27 20:13:46'),(12,6,'Fragmentation Test','TEMP-003','visual','pass_fail',NULL,NULL,NULL,NULL,1,30,'Verify fragment count meets EN 12150 (>40 per 50x50mm)',1,'2026-06-27 20:13:46'),(13,7,'Lamination Clarity','LAMI-001','visual','pass_fail',NULL,NULL,NULL,NULL,1,10,'Check for bubbles, delamination, or haze',1,'2026-06-27 20:13:46'),(14,7,'Edge Seal Integrity','LAMI-002','visual','pass_fail',NULL,NULL,NULL,NULL,1,20,'Inspect edge seal for gaps or moisture ingress',1,'2026-06-27 20:13:46'),(15,8,'Final Dimension Check','QC-001','measurement','range',NULL,-1.0000,1.0000,'mm',1,10,'Final measurement of all dimensions',1,'2026-06-27 20:13:46'),(16,8,'Visual Inspection','QC-002','visual','pass_fail',NULL,NULL,NULL,NULL,1,20,'Full visual inspection under inspection light',1,'2026-06-27 20:13:46'),(17,8,'Label Verification','QC-003','visual','pass_fail',NULL,NULL,NULL,NULL,0,30,'Verify label matches order specs',1,'2026-06-27 20:13:46'),(18,9,'Packaging Integrity','PACK-001','visual','pass_fail',NULL,NULL,NULL,NULL,1,10,'Verify proper edge protection and separation',1,'2026-06-27 20:13:46'),(19,9,'Rack Loading Check','PACK-002','visual','pass_fail',NULL,NULL,NULL,NULL,0,20,'Verify glass is properly secured in rack',1,'2026-06-27 20:13:46');
/*!40000 ALTER TABLE `qc_checkpoints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quantity_breaks`
--

DROP TABLE IF EXISTS `quantity_breaks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quantity_breaks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `min_qty` int NOT NULL,
  `max_qty` int NOT NULL,
  `discount_percent` decimal(5,2) NOT NULL,
  `is_active` tinyint DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quantity_breaks`
--

LOCK TABLES `quantity_breaks` WRITE;
/*!40000 ALTER TABLE `quantity_breaks` DISABLE KEYS */;
INSERT INTO `quantity_breaks` VALUES (1,'Standard (1-10)',1,10,0.00,1),(2,'Volume (11-50)',11,50,5.00,1),(3,'Bulk (51-100)',51,100,10.00,1),(4,'Enterprise (100+)',101,99999,15.00,1);
/*!40000 ALTER TABLE `quantity_breaks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quote_lines`
--

DROP TABLE IF EXISTS `quote_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quote_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `unit_price` decimal(12,4) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `line_total` decimal(12,2) DEFAULT '0.00',
  `width_inches` decimal(8,3) DEFAULT NULL,
  `height_inches` decimal(8,3) DEFAULT NULL,
  `sqft` decimal(10,4) DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `quote_id` (`quote_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `quote_lines_ibfk_1` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quote_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quote_lines`
--

LOCK TABLES `quote_lines` WRITE;
/*!40000 ALTER TABLE `quote_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `quote_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotes`
--

DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `quote_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` enum('draft','sent','accepted','rejected','expired','converted') DEFAULT 'draft',
  `salesperson_id` int DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `terms_conditions` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quote_number` (`quote_number`),
  KEY `customer_id` (`customer_id`),
  KEY `salesperson_id` (`salesperson_id`),
  CONSTRAINT `quotes_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `quotes_ibfk_2` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotes`
--

LOCK TABLES `quotes` WRITE;
/*!40000 ALTER TABLE `quotes` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rack_configurations`
--

DROP TABLE IF EXISTS `rack_configurations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rack_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_code` varchar(50) NOT NULL,
  `rack_type` enum('a_frame','l_frame','flat_bed','custom') NOT NULL,
  `max_weight_lbs` decimal(10,2) NOT NULL,
  `max_pieces` int NOT NULL,
  `width_inches` decimal(8,2) DEFAULT NULL,
  `height_inches` decimal(8,2) DEFAULT NULL,
  `depth_inches` decimal(8,2) DEFAULT NULL,
  `slot_count` int DEFAULT '10',
  `slot_width_inches` decimal(6,2) DEFAULT '2.00',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rack_code` (`rack_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rack_configurations`
--

LOCK TABLES `rack_configurations` WRITE;
/*!40000 ALTER TABLE `rack_configurations` DISABLE KEYS */;
INSERT INTO `rack_configurations` VALUES (1,'AF-001','a_frame',3000.00,25,96.00,84.00,48.00,12,2.50,1,NULL,'2026-06-27 20:13:46'),(2,'AF-002','a_frame',3000.00,25,96.00,84.00,48.00,12,2.50,1,NULL,'2026-06-27 20:13:46'),(3,'AF-003','a_frame',2000.00,15,72.00,72.00,36.00,8,2.50,1,NULL,'2026-06-27 20:13:46'),(4,'LF-001','l_frame',4000.00,30,96.00,96.00,36.00,15,2.00,1,NULL,'2026-06-27 20:13:46'),(5,'LF-002','l_frame',4000.00,30,96.00,96.00,36.00,15,2.00,1,NULL,'2026-06-27 20:13:46'),(6,'FB-001','flat_bed',5000.00,40,120.00,6.00,96.00,20,1.50,1,NULL,'2026-06-27 20:13:46'),(7,'CUS-001','custom',1500.00,10,60.00,60.00,30.00,5,3.00,1,NULL,'2026-06-27 20:13:46');
/*!40000 ALTER TABLE `rack_configurations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rack_load_items`
--

DROP TABLE IF EXISTS `rack_load_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rack_load_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_load_id` int NOT NULL,
  `slot_number` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `shipment_id` int DEFAULT NULL,
  `item_description` varchar(255) DEFAULT NULL,
  `width_inches` decimal(8,2) DEFAULT NULL,
  `height_inches` decimal(8,2) DEFAULT NULL,
  `thickness_mm` decimal(5,2) DEFAULT NULL,
  `weight_lbs` decimal(8,2) DEFAULT NULL,
  `glass_type` varchar(100) DEFAULT NULL,
  `delivery_stop_id` int DEFAULT NULL,
  `load_sequence` int DEFAULT NULL,
  `unload_sequence` int DEFAULT NULL,
  `status` enum('planned','loaded','in_transit','delivered','damaged') DEFAULT 'planned',
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `idx_rli_load` (`rack_load_id`),
  KEY `idx_rli_wo` (`work_order_id`),
  KEY `idx_rli_stop` (`delivery_stop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rack_load_items`
--

LOCK TABLES `rack_load_items` WRITE;
/*!40000 ALTER TABLE `rack_load_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `rack_load_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rack_loads`
--

DROP TABLE IF EXISTS `rack_loads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rack_loads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_id` int NOT NULL,
  `route_id` int DEFAULT NULL,
  `load_date` date NOT NULL,
  `status` enum('planning','loading','loaded','in_transit','unloading','empty') DEFAULT 'planning',
  `total_pieces` int DEFAULT '0',
  `total_weight_lbs` decimal(10,2) DEFAULT '0.00',
  `loaded_by` int DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `loaded_at` datetime DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rackload_rack` (`rack_id`),
  KEY `idx_rackload_route` (`route_id`),
  KEY `idx_rackload_date` (`load_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rack_loads`
--

LOCK TABLES `rack_loads` WRITE;
/*!40000 ALTER TABLE `rack_loads` DISABLE KEYS */;
INSERT INTO `rack_loads` VALUES (1,1,1,'2026-06-27','planning',0,0.00,1,NULL,NULL,NULL,'2026-06-27 20:15:49');
/*!40000 ALTER TABLE `rack_loads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routing_operations`
--

DROP TABLE IF EXISTS `routing_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routing_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `routing_id` int NOT NULL,
  `sequence` int NOT NULL,
  `work_center_id` int NOT NULL,
  `operation_description` varchar(255) DEFAULT NULL,
  `setup_time_hours` decimal(8,4) DEFAULT '0.0000',
  `run_time_hours` decimal(8,4) DEFAULT '0.0000',
  `overlap_percent` decimal(5,2) DEFAULT '0.00',
  `efficiency_percent` decimal(5,2) DEFAULT '100.00',
  `is_subcontract` tinyint(1) DEFAULT '0',
  `subcontract_vendor_id` int DEFAULT NULL,
  `instructions` text,
  PRIMARY KEY (`id`),
  KEY `routing_id` (`routing_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `routing_operations_ibfk_1` FOREIGN KEY (`routing_id`) REFERENCES `routings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `routing_operations_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routing_operations`
--

LOCK TABLES `routing_operations` WRITE;
/*!40000 ALTER TABLE `routing_operations` DISABLE KEYS */;
/*!40000 ALTER TABLE `routing_operations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routings`
--

DROP TABLE IF EXISTS `routings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `revision` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `routings_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routings`
--

LOCK TABLES `routings` WRITE;
/*!40000 ALTER TABLE `routings` DISABLE KEYS */;
/*!40000 ALTER TABLE `routings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_lines`
--

DROP TABLE IF EXISTS `sales_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_ordered` decimal(12,4) NOT NULL,
  `quantity_shipped` decimal(12,4) DEFAULT '0.0000',
  `quantity_backordered` decimal(12,4) DEFAULT '0.0000',
  `uom` varchar(20) DEFAULT NULL,
  `unit_price` decimal(12,4) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `line_total` decimal(12,2) DEFAULT '0.00',
  `width_inches` decimal(8,3) DEFAULT NULL,
  `height_inches` decimal(8,3) DEFAULT NULL,
  `sqft` decimal(10,4) DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `status` enum('open','partial','complete','cancelled') DEFAULT 'open',
  `required_date` date DEFAULT NULL,
  `notes` text,
  `product_type` varchar(50) DEFAULT NULL,
  `glass_type` varchar(50) DEFAULT NULL,
  `thickness` varchar(20) DEFAULT NULL,
  `edge_type` varchar(50) DEFAULT NULL,
  `shape` varchar(30) DEFAULT 'rectangular',
  `interlayer` varchar(50) DEFAULT NULL,
  `has_holes` tinyint(1) DEFAULT '0',
  `holes_count` int DEFAULT '0',
  `cutouts` text,
  `coating` varchar(50) DEFAULT NULL,
  `spacer_type` varchar(50) DEFAULT NULL,
  `gas_fill` varchar(30) DEFAULT NULL,
  `manufacturing_notes` text,
  `drawing_ref` varchar(100) DEFAULT NULL,
  `production_status` varchar(20) DEFAULT 'pending',
  `has_notches` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_sol_prod_status` (`production_status`),
  CONSTRAINT `sales_order_lines_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_lines_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_lines`
--

LOCK TABLES `sales_order_lines` WRITE;
/*!40000 ALTER TABLE `sales_order_lines` DISABLE KEYS */;
INSERT INTO `sales_order_lines` VALUES (2,7,1,NULL,'Tempered Glass Panel 48x72',5.0000,0.0000,0.0000,'Each',125.0000,0.00,625.00,48.000,72.000,24.0000,NULL,'open',NULL,NULL,'tempered_panel','Clear Float','10mm','Flat Polish','rectangular',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL,'pending',0);
/*!40000 ALTER TABLE `sales_order_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `customer_id` int NOT NULL,
  `customer_po` varchar(50) DEFAULT NULL,
  `project_name` varchar(200) DEFAULT NULL,
  `order_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `promised_date` date DEFAULT NULL,
  `ship_date` date DEFAULT NULL,
  `status` enum('draft','open','partial','complete','closed','cancelled') DEFAULT 'draft',
  `quote_id` int DEFAULT NULL,
  `salesperson_id` int DEFAULT NULL,
  `carrier_id` int DEFAULT NULL,
  `ship_via` varchar(50) DEFAULT NULL,
  `fob` varchar(50) DEFAULT NULL,
  `ship_to_name` varchar(100) DEFAULT NULL,
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `subtotal` decimal(12,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) DEFAULT '0.00',
  `freight_amount` decimal(12,2) DEFAULT '0.00',
  `discount_amount` decimal(12,2) DEFAULT '0.00',
  `total` decimal(12,2) DEFAULT '0.00',
  `deposit_amount` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `internal_notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `customer_id` (`customer_id`),
  KEY `quote_id` (`quote_id`),
  KEY `salesperson_id` (`salesperson_id`),
  KEY `carrier_id` (`carrier_id`),
  KEY `idx_so_status` (`status`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`),
  CONSTRAINT `sales_orders_ibfk_3` FOREIGN KEY (`salesperson_id`) REFERENCES `salespeople` (`id`),
  CONSTRAINT `sales_orders_ibfk_4` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
INSERT INTO `sales_orders` VALUES (7,'SO-10007',1,'PO-001','Test Storefront','2026-06-29',NULL,NULL,NULL,'open',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,625.00,0.00,0.00,0.00,625.00,0.00,NULL,NULL,1,'2026-06-29 14:12:47','2026-06-29 14:12:47');
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salespeople`
--

DROP TABLE IF EXISTS `salespeople`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salespeople` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salespeople`
--

LOCK TABLES `salespeople` WRITE;
/*!40000 ALTER TABLE `salespeople` DISABLE KEYS */;
INSERT INTO `salespeople` VALUES (1,'John Smith',NULL,'john@maxtagroup.com',NULL,5.00,1),(2,'Sarah Johnson',NULL,'sarah@maxtagroup.com',NULL,6.00,1),(3,'Mike Williams',NULL,'mike@maxtagroup.com',NULL,5.50,1);
/*!40000 ALTER TABLE `salespeople` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_entries`
--

DROP TABLE IF EXISTS `schedule_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int DEFAULT NULL,
  `work_center_id` int DEFAULT NULL,
  `operation_name` varchar(255) DEFAULT NULL,
  `planned_start` datetime DEFAULT NULL,
  `planned_end` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_end` datetime DEFAULT NULL,
  `status` enum('scheduled','in-progress','completed','delayed','cancelled') DEFAULT 'scheduled',
  `priority` int DEFAULT '5',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_entries`
--

LOCK TABLES `schedule_entries` WRITE;
/*!40000 ALTER TABLE `schedule_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scheduling_blocks`
--

DROP TABLE IF EXISTS `scheduling_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_blocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `work_order_id` int DEFAULT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `block_start` datetime NOT NULL,
  `block_end` datetime NOT NULL,
  `block_type` enum('production','setup','maintenance','reserved','break') DEFAULT 'production',
  `status` enum('planned','confirmed','in_progress','completed','cancelled') DEFAULT 'planned',
  `assigned_operator_id` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sb_wc_date` (`work_center_id`,`block_start`),
  KEY `idx_sb_wo` (`work_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scheduling_blocks`
--

LOCK TABLES `scheduling_blocks` WRITE;
/*!40000 ALTER TABLE `scheduling_blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `scheduling_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scheduling_constraints`
--

DROP TABLE IF EXISTS `scheduling_constraints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_constraints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int NOT NULL,
  `constraint_type` enum('max_concurrent','min_batch','max_batch','requires_cooldown','requires_preheat','shift_only') NOT NULL,
  `constraint_value` decimal(10,2) DEFAULT NULL,
  `constraint_unit` varchar(30) DEFAULT NULL,
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_sc_wc` (`work_center_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scheduling_constraints`
--

LOCK TABLES `scheduling_constraints` WRITE;
/*!40000 ALTER TABLE `scheduling_constraints` DISABLE KEYS */;
INSERT INTO `scheduling_constraints` VALUES (1,1,'max_concurrent',2.00,'tables','Max 2 cutting tables running simultaneously',1),(2,6,'min_batch',4.00,'pieces','Minimum 4 pieces per tempering run for efficiency',1),(3,6,'requires_preheat',30.00,'minutes','Oven requires 30min preheat before first batch',1),(4,6,'requires_cooldown',15.00,'minutes','Cooldown between batches',1),(5,7,'requires_preheat',60.00,'minutes','Autoclave preheat time',1),(6,7,'max_batch',12.00,'pieces','Max 12 pieces per autoclave cycle',1),(7,5,'max_concurrent',1.00,'lines','Single wash line',1),(8,3,'max_concurrent',1.00,'machines','Single CNC machine',1);
/*!40000 ALTER TABLE `scheduling_constraints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scrap_codes`
--

DROP TABLE IF EXISTS `scrap_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scrap_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scrap_codes`
--

LOCK TABLES `scrap_codes` WRITE;
/*!40000 ALTER TABLE `scrap_codes` DISABLE KEYS */;
INSERT INTO `scrap_codes` VALUES (1,'BREAK','Glass breakage during handling',1),(2,'CHIP','Edge chip during processing',1),(3,'SCRATCH','Surface scratch detected in QC',1),(4,'TEMPER','Tempering failure',1),(5,'CUT-ERR','Cutting error - wrong dimensions',1),(6,'DRILL-ERR','Drilling error - wrong position',1),(7,'EDGE-ERR','Edge processing error',1),(8,'LAMI-ERR','Lamination defect',1),(9,'INCL','Inclusion or contamination',1),(10,'WARP','Warping during tempering',1),(11,'OTHER','Other - see notes',1);
/*!40000 ALTER TABLE `scrap_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sequences`
--

DROP TABLE IF EXISTS `sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sequences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `seq_name` varchar(50) NOT NULL,
  `prefix` varchar(10) DEFAULT '',
  `current_value` int DEFAULT '0',
  `increment_by` int DEFAULT '1',
  `pad_length` int DEFAULT '5',
  PRIMARY KEY (`id`),
  UNIQUE KEY `seq_name` (`seq_name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sequences`
--

LOCK TABLES `sequences` WRITE;
/*!40000 ALTER TABLE `sequences` DISABLE KEYS */;
INSERT INTO `sequences` VALUES (1,'quote','QT-',1000,1,5),(2,'sales_order','SO-',10007,1,5),(3,'shipment','SH-',1000,1,5),(4,'work_order','WO-',20000,1,5),(5,'purchase_order','PO-',5000,1,5),(6,'ar_invoice','INV-',10000,1,5),(7,'ap_invoice','AP-',1000,1,5),(8,'customer','C-',10000,1,5),(9,'vendor','V-',1000,1,5),(10,'receipt','REC-',1000,1,5),(11,'payment','PMT-',1000,1,5),(12,'journal','JV-',1000,1,5),(13,'adjustment','ADJ-',1000,1,5),(14,'wo_receipt','WOR-',1000,1,5),(15,'po_receipt','POR-',1000,1,5);
/*!40000 ALTER TABLE `sequences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `serial_numbers`
--

DROP TABLE IF EXISTS `serial_numbers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `serial_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `serial_number` varchar(100) NOT NULL,
  `item_id` int NOT NULL,
  `lot_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `status` enum('available','issued','sold','scrapped','in_service','reserved') DEFAULT 'available',
  `received_date` date DEFAULT NULL,
  `sold_date` date DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `work_order_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `item_id` (`item_id`),
  KEY `lot_id` (`lot_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `serial_numbers_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `serial_numbers_ibfk_2` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`id`),
  CONSTRAINT `serial_numbers_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `serial_numbers`
--

LOCK TABLES `serial_numbers` WRITE;
/*!40000 ALTER TABLE `serial_numbers` DISABLE KEYS */;
/*!40000 ALTER TABLE `serial_numbers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_config`
--

DROP TABLE IF EXISTS `sg_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) DEFAULT NULL,
  `setting_value` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_config`
--

LOCK TABLES `sg_config` WRITE;
/*!40000 ALTER TABLE `sg_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_order_items`
--

DROP TABLE IF EXISTS `sg_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sg_order_id` int DEFAULT NULL,
  `product_type` varchar(100) DEFAULT NULL,
  `width` decimal(10,2) DEFAULT NULL,
  `height` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `glass_type` varchar(100) DEFAULT NULL,
  `thickness` varchar(50) DEFAULT NULL,
  `edge_work` varchar(100) DEFAULT NULL,
  `coatings` varchar(255) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `notes` text,
  `dxf_file_url` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_order_items`
--

LOCK TABLES `sg_order_items` WRITE;
/*!40000 ALTER TABLE `sg_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sg_orders`
--

DROP TABLE IF EXISTS `sg_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sg_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sg_order_id` varchar(100) DEFAULT NULL,
  `sg_quote_id` varchar(100) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `order_date` datetime DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `status` enum('pending','imported','processing','completed','cancelled') DEFAULT 'pending',
  `sales_order_id` int DEFAULT NULL,
  `raw_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sg_orders`
--

LOCK TABLES `sg_orders` WRITE;
/*!40000 ALTER TABLE `sg_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sg_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_lines`
--

DROP TABLE IF EXISTS `shipment_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shipment_id` int NOT NULL,
  `sales_order_line_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity_shipped` decimal(12,4) NOT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sales_order_line_id` (`sales_order_line_id`),
  KEY `item_id` (`item_id`),
  KEY `idx_sl_shipment` (`shipment_id`),
  CONSTRAINT `shipment_lines_ibfk_1` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shipment_lines_ibfk_2` FOREIGN KEY (`sales_order_line_id`) REFERENCES `sales_order_lines` (`id`),
  CONSTRAINT `shipment_lines_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_lines`
--

LOCK TABLES `shipment_lines` WRITE;
/*!40000 ALTER TABLE `shipment_lines` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_lines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shipment_number` varchar(20) NOT NULL,
  `sales_order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `shipment_date` date NOT NULL,
  `carrier_id` int DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `freight_charge` decimal(10,2) DEFAULT '0.00',
  `status` enum('draft','shipped','delivered','cancelled') DEFAULT 'draft',
  `ship_to_name` varchar(100) DEFAULT NULL,
  `ship_address1` varchar(100) DEFAULT NULL,
  `ship_address2` varchar(100) DEFAULT NULL,
  `ship_city` varchar(50) DEFAULT NULL,
  `ship_state` varchar(50) DEFAULT NULL,
  `ship_zip` varchar(20) DEFAULT NULL,
  `notes` text,
  `shipped_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipment_number` (`shipment_number`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `carrier_id` (`carrier_id`),
  CONSTRAINT `shipments_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `shipments_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `shipments_ibfk_3` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_floor_tracking`
--

DROP TABLE IF EXISTS `shop_floor_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_floor_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `wo_routing_id` int NOT NULL,
  `work_center_id` int NOT NULL,
  `status` enum('queued','in_progress','complete','on_hold','recut') DEFAULT 'queued',
  `operator_name` varchar(100) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `quantity_good` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrap` decimal(12,4) DEFAULT '0.0000',
  `scrap_code` varchar(20) DEFAULT NULL,
  `scrap_reason` text,
  `label_printed` tinyint(1) DEFAULT '0',
  `label_printed_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `wo_routing_id` (`wo_routing_id`),
  KEY `work_center_id` (`work_center_id`),
  CONSTRAINT `shop_floor_tracking_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `shop_floor_tracking_ibfk_2` FOREIGN KEY (`wo_routing_id`) REFERENCES `wo_routing` (`id`),
  CONSTRAINT `shop_floor_tracking_ibfk_3` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_floor_tracking`
--

LOCK TABLES `shop_floor_tracking` WRITE;
/*!40000 ALTER TABLE `shop_floor_tracking` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_floor_tracking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `category` varchar(50) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_groups`
--

DROP TABLE IF EXISTS `tax_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `rate` decimal(6,4) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_groups`
--

LOCK TABLES `tax_groups` WRITE;
/*!40000 ALTER TABLE `tax_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_jurisdictions`
--

DROP TABLE IF EXISTS `tax_jurisdictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_jurisdictions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `jurisdiction_code` varchar(20) NOT NULL,
  `jurisdiction_type` enum('state','county','city','district','federal') NOT NULL,
  `parent_jurisdiction_id` int DEFAULT NULL,
  `tax_rate` decimal(6,4) NOT NULL DEFAULT '0.0000',
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_jurisdictions`
--

LOCK TABLES `tax_jurisdictions` WRITE;
/*!40000 ALTER TABLE `tax_jurisdictions` DISABLE KEYS */;
INSERT INTO `tax_jurisdictions` VALUES (1,'Texas State','TX','state',NULL,6.2500,'2024-01-01',NULL,1),(2,'Harris County','TX-HARRIS','county',NULL,0.0000,'2024-01-01',NULL,1),(3,'Houston City','TX-HOU','city',NULL,1.0000,'2024-01-01',NULL,1),(4,'MTA Transit','TX-MTA','district',NULL,1.0000,'2024-01-01',NULL,1),(5,'California State','CA','state',NULL,7.2500,'2024-01-01',NULL,1),(6,'Los Angeles County','CA-LA','county',NULL,2.2500,'2024-01-01',NULL,1);
/*!40000 ALTER TABLE `tax_jurisdictions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_returns`
--

DROP TABLE IF EXISTS `tax_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jurisdiction_id` int NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `filing_frequency` enum('monthly','quarterly','annually') NOT NULL,
  `total_taxable_sales` decimal(14,2) DEFAULT '0.00',
  `total_tax_collected` decimal(14,2) DEFAULT '0.00',
  `total_tax_paid` decimal(14,2) DEFAULT '0.00',
  `net_tax_due` decimal(14,2) DEFAULT '0.00',
  `status` enum('open','filed','paid') DEFAULT 'open',
  `filed_date` date DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `confirmation_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_returns`
--

LOCK TABLES `tax_returns` WRITE;
/*!40000 ALTER TABLE `tax_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_transactions`
--

DROP TABLE IF EXISTS `tax_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('collected','paid','adjustment') NOT NULL,
  `jurisdiction_id` int NOT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_id` int DEFAULT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `vendor_id` int DEFAULT NULL,
  `taxable_amount` decimal(14,2) NOT NULL,
  `tax_rate` decimal(6,4) NOT NULL,
  `tax_amount` decimal(14,2) NOT NULL,
  `transaction_date` date NOT NULL,
  `period_id` int DEFAULT NULL,
  `is_remitted` tinyint(1) DEFAULT '0',
  `remitted_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_transactions`
--

LOCK TABLES `tax_transactions` WRITE;
/*!40000 ALTER TABLE `tax_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `role` enum('admin','manager','sales','production','purchasing','accounting','shipping','readonly') NOT NULL DEFAULT 'readonly',
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@maxtagroup.com','$2a$10$JGKQ/d3BuiZyJuZ.8QHjP.X9424J0WA4FiDL2fQZEcyt72UTH2oky','Admin','User','admin',1,'2026-06-29 14:12:47','2026-06-27 15:21:02','2026-06-29 14:12:47');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_number` varchar(50) NOT NULL,
  `vehicle_type` enum('flatbed','box_truck','van','trailer','pickup') NOT NULL,
  `make` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `license_plate` varchar(30) DEFAULT NULL,
  `vin` varchar(50) DEFAULT NULL,
  `max_weight_lbs` decimal(10,2) DEFAULT NULL,
  `max_rack_count` int DEFAULT '2',
  `fuel_type` enum('diesel','gasoline','electric','hybrid') DEFAULT 'diesel',
  `mpg_estimate` decimal(5,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_service_date` date DEFAULT NULL,
  `next_service_date` date DEFAULT NULL,
  `odometer_miles` int DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,'TRK-001','flatbed','Ford','F-550',2023,'TX-GLZ-001',NULL,15000.00,3,'diesel',12.50,1,NULL,NULL,45230,NULL,'2026-06-27 20:13:46'),(2,'TRK-002','flatbed','International','MV607',2022,'TX-GLZ-002',NULL,22000.00,4,'diesel',10.00,1,NULL,NULL,67890,NULL,'2026-06-27 20:13:46'),(3,'VAN-001','van','Mercedes','Sprinter 3500',2024,'TX-GLZ-003',NULL,5500.00,1,'diesel',18.00,1,NULL,NULL,12450,NULL,'2026-06-27 20:13:46'),(4,'TRL-001','trailer','Utility','Glass Hauler',2021,'TX-GLZ-004',NULL,30000.00,6,'diesel',8.00,1,NULL,NULL,89000,NULL,'2026-06-27 20:13:46');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_payments`
--

DROP TABLE IF EXISTS `vendor_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_number` varchar(20) NOT NULL,
  `check_number` varchar(20) DEFAULT NULL,
  `vendor_id` int NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` enum('check','wire','ach') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `bank_id` int DEFAULT NULL,
  `posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `gl_voucher_id` int DEFAULT NULL,
  `notes` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `vendor_id` (`vendor_id`),
  KEY `bank_id` (`bank_id`),
  CONSTRAINT `vendor_payments_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`),
  CONSTRAINT `vendor_payments_ibfk_2` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_payments`
--

LOCK TABLES `vendor_payments` WRITE;
/*!40000 ALTER TABLE `vendor_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_types`
--

DROP TABLE IF EXISTS `vendor_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendor_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_types`
--

LOCK TABLES `vendor_types` WRITE;
/*!40000 ALTER TABLE `vendor_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendor_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendor_number` varchar(20) NOT NULL,
  `company_name` varchar(100) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `address1` varchar(100) DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip` varchar(20) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'USA',
  `phone` varchar(30) DEFAULT NULL,
  `fax` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `vendor_type_id` int DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `tax_id` varchar(50) DEFAULT NULL,
  `is_1099` tinyint(1) DEFAULT '0',
  `current_balance` decimal(12,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_number` (`vendor_number`),
  KEY `vendor_type_id` (`vendor_type_id`),
  CONSTRAINT `vendors_ibfk_1` FOREIGN KEY (`vendor_type_id`) REFERENCES `vendor_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_labor`
--

DROP TABLE IF EXISTS `wo_labor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_labor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `wo_routing_id` int DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `work_date` date NOT NULL,
  `hours_worked` decimal(6,2) NOT NULL,
  `hours` decimal(6,2) DEFAULT '0.00',
  `rate` decimal(10,2) DEFAULT '0.00',
  `labor_type` enum('setup','run') DEFAULT 'run',
  `labor_rate` decimal(10,2) DEFAULT '0.00',
  `labor_cost` decimal(10,2) DEFAULT '0.00',
  `operation_sequence` int DEFAULT NULL,
  `notes` text,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `wo_routing_id` (`wo_routing_id`),
  CONSTRAINT `wo_labor_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `wo_labor_ibfk_2` FOREIGN KEY (`wo_routing_id`) REFERENCES `wo_routing` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_labor`
--

LOCK TABLES `wo_labor` WRITE;
/*!40000 ALTER TABLE `wo_labor` DISABLE KEYS */;
/*!40000 ALTER TABLE `wo_labor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_materials`
--

DROP TABLE IF EXISTS `wo_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `line_number` int NOT NULL,
  `item_id` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity_required` decimal(12,4) NOT NULL,
  `waste_percent` decimal(5,2) DEFAULT '0.00',
  `total_qty` decimal(12,4) NOT NULL,
  `quantity_issued` decimal(12,4) DEFAULT '0.0000',
  `unit_cost` decimal(12,4) DEFAULT '0.0000',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `lot_number` varchar(50) DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `wo_materials_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wo_materials_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_materials`
--

LOCK TABLES `wo_materials` WRITE;
/*!40000 ALTER TABLE `wo_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `wo_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_receipts`
--

DROP TABLE IF EXISTS `wo_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receipt_number` varchar(20) NOT NULL,
  `work_order_id` int NOT NULL,
  `receipt_date` date NOT NULL,
  `quantity_completed` decimal(12,4) NOT NULL,
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `scrap_code` varchar(20) DEFAULT NULL,
  `is_final` tinyint(1) DEFAULT '0',
  `material_cost` decimal(12,2) DEFAULT '0.00',
  `labor_cost` decimal(12,2) DEFAULT '0.00',
  `setup_cost` decimal(12,2) DEFAULT '0.00',
  `overhead_cost` decimal(12,2) DEFAULT '0.00',
  `outside_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `location_id` int DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `serial_number_start` varchar(100) DEFAULT NULL,
  `serial_number_end` varchar(100) DEFAULT NULL,
  `use_estimated_cost` tinyint(1) DEFAULT '0',
  `use_net_wip` tinyint(1) DEFAULT '0',
  `posted` tinyint(1) DEFAULT '0',
  `is_posted` tinyint(1) DEFAULT '0',
  `posted_date` datetime DEFAULT NULL,
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `work_order_id` (`work_order_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `wo_receipts_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`),
  CONSTRAINT `wo_receipts_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_receipts`
--

LOCK TABLES `wo_receipts` WRITE;
/*!40000 ALTER TABLE `wo_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `wo_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wo_routing`
--

DROP TABLE IF EXISTS `wo_routing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wo_routing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `sequence` int NOT NULL,
  `work_center_id` int NOT NULL,
  `operation_description` varchar(255) DEFAULT NULL,
  `setup_hours_estimated` decimal(8,4) DEFAULT '0.0000',
  `run_hours_estimated` decimal(8,4) DEFAULT '0.0000',
  `setup_hours_actual` decimal(8,4) DEFAULT '0.0000',
  `run_hours_actual` decimal(8,4) DEFAULT '0.0000',
  `quantity_completed` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `status` enum('pending','in_progress','complete') DEFAULT 'pending',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `actual_start` datetime DEFAULT NULL,
  `actual_finish` datetime DEFAULT NULL,
  `actual_hours` decimal(8,4) DEFAULT '0.0000',
  PRIMARY KEY (`id`),
  KEY `work_center_id` (`work_center_id`),
  KEY `idx_wor_wo_seq` (`work_order_id`,`sequence`),
  CONSTRAINT `wo_routing_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wo_routing_ibfk_2` FOREIGN KEY (`work_center_id`) REFERENCES `work_centers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wo_routing`
--

LOCK TABLES `wo_routing` WRITE;
/*!40000 ALTER TABLE `wo_routing` DISABLE KEYS */;
/*!40000 ALTER TABLE `wo_routing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_center_capacity`
--

DROP TABLE IF EXISTS `work_center_capacity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_center_capacity` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_center_id` int DEFAULT NULL,
  `day_of_week` tinyint DEFAULT NULL,
  `available_hours` decimal(4,1) DEFAULT '8.0',
  `shift_start` time DEFAULT '07:00:00',
  `shift_end` time DEFAULT '15:30:00',
  `is_available` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_center_capacity`
--

LOCK TABLES `work_center_capacity` WRITE;
/*!40000 ALTER TABLE `work_center_capacity` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_center_capacity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_centers`
--

DROP TABLE IF EXISTS `work_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_centers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `department` varchar(50) DEFAULT NULL,
  `capacity_type` enum('hours','units','sqft','linear_inches','weight') DEFAULT 'hours',
  `available_hours_per_day` decimal(5,2) DEFAULT '8.00',
  `num_machines` int DEFAULT '1',
  `efficiency_rate` decimal(5,2) DEFAULT '100.00',
  `labor_rate` decimal(10,2) DEFAULT '0.00',
  `overhead_rate` decimal(10,2) DEFAULT '0.00',
  `queue_time_hours` decimal(5,2) DEFAULT '0.00',
  `move_time_hours` decimal(5,2) DEFAULT '0.00',
  `scheduling_type` enum('finite','infinite') DEFAULT 'infinite',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_centers`
--

LOCK TABLES `work_centers` WRITE;
/*!40000 ALTER TABLE `work_centers` DISABLE KEYS */;
INSERT INTO `work_centers` VALUES (1,'CUT','Cutting Table','Cutting','sqft',8.00,1,100.00,25.00,15.00,0.00,0.00,'finite',1,NULL),(2,'EDGE','Edge Polisher','Polishing','linear_inches',8.00,1,100.00,30.00,12.00,0.00,0.00,'infinite',1,NULL),(3,'CNC','CNC/Waterjet','Fabrication','hours',8.00,1,100.00,45.00,25.00,0.00,0.00,'finite',1,NULL),(4,'DRILL','Drilling Station','Fabrication','hours',8.00,1,100.00,28.00,10.00,0.00,0.00,'infinite',1,NULL),(5,'WASH','Wash Line','Preparation','sqft',8.00,1,100.00,15.00,8.00,0.00,0.00,'infinite',1,NULL),(6,'TEMP','Tempering Oven','Tempering','sqft',8.00,1,100.00,35.00,40.00,0.00,0.00,'finite',1,NULL),(7,'LAMI','Lamination Line','Lamination','sqft',8.00,1,100.00,32.00,20.00,0.00,0.00,'finite',1,NULL),(8,'QC','Quality Control','Inspection','units',8.00,1,100.00,22.00,5.00,0.00,0.00,'infinite',1,NULL),(9,'PACK','Packing Station','Shipping','units',8.00,1,100.00,18.00,8.00,0.00,0.00,'infinite',1,NULL);
/*!40000 ALTER TABLE `work_centers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `wo_type` varchar(20) DEFAULT NULL,
  `item_id` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `quantity_completed` decimal(12,4) DEFAULT '0.0000',
  `qty_completed` decimal(12,4) DEFAULT '0.0000',
  `quantity_scrapped` decimal(12,4) DEFAULT '0.0000',
  `qty_scrapped` decimal(12,4) DEFAULT '0.0000',
  `sales_order_id` int DEFAULT NULL,
  `sales_order_line` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `status` enum('planned','released','in_progress','complete','closed','cancelled') DEFAULT 'planned',
  `priority` varchar(20) DEFAULT 'Normal',
  `scheduling_type` enum('forward','backward','floating') DEFAULT 'floating',
  `release_date` date DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `finish_date` date DEFAULT NULL,
  `actual_finish_date` datetime DEFAULT NULL,
  `requested_date` date DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `lot_number` varchar(50) DEFAULT NULL,
  `estimated_material_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_labor_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_setup_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_overhead_cost` decimal(12,2) DEFAULT '0.00',
  `estimated_outside_cost` decimal(12,2) DEFAULT '0.00',
  `actual_material_cost` decimal(12,2) DEFAULT '0.00',
  `actual_labor_cost` decimal(12,2) DEFAULT '0.00',
  `actual_setup_cost` decimal(12,2) DEFAULT '0.00',
  `actual_overhead_cost` decimal(12,2) DEFAULT '0.00',
  `actual_outside_cost` decimal(12,2) DEFAULT '0.00',
  `project_number` varchar(50) DEFAULT NULL,
  `purchase_order` varchar(50) DEFAULT NULL,
  `service_job` varchar(50) DEFAULT NULL,
  `comments` text,
  `wo_printed` tinyint(1) DEFAULT '0',
  `entered_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `parent_wo_id` int DEFAULT NULL,
  `wo_category` enum('standard','assembly','glass_component','interlayer_component') DEFAULT 'standard',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `item_id` (`item_id`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_wo_status` (`status`),
  KEY `idx_wo_parent` (`parent_wo_id`),
  CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  CONSTRAINT `work_orders_ibfk_2` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `work_orders_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `work_orders_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-01 19:24:01
