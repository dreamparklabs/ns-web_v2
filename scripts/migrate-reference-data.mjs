#!/usr/bin/env node
/**
 * Migration script to copy reference data from dev to production
 * Usage: node scripts/migrate-reference-data.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Environment configurations
const DEV_URL = "https://uncommon-rook-99.convex.cloud";
const PROD_URL = "https://spotted-skunk-453.convex.cloud";

const devClient = new ConvexHttpClient(DEV_URL);
const prodClient = new ConvexHttpClient(PROD_URL);

async function migrateTable(tableName) {
  console.log(`\n📋 Migrating ${tableName}...`);
  
  try {
    // Query all data from dev
    const data = await devClient.query(api[tableName].list);
    
    if (!data || data.length === 0) {
      console.log(`⚠️  No data found in dev ${tableName} table`);
      return;
    }
    
    console.log(`   Found ${data.length} records in dev`);
    
    // Clear production table first (optional - comment out if you want to keep existing data)
    console.log(`   Clearing production ${tableName} table...`);
    try {
      await prodClient.mutation(api[tableName].deleteAll);
    } catch (err) {
      console.log(`   ℹ️  No deleteAll function, skipping clear`);
    }
    
    // Insert each record into production
    let successCount = 0;
    for (const record of data) {
      try {
        // Remove _id and _creationTime from the record
        const { _id, _creationTime, ...recordData } = record;
        
        await prodClient.mutation(api[tableName].create, recordData);
        successCount++;
      } catch (err) {
        console.error(`   ❌ Failed to insert record:`, err.message);
      }
    }
    
    console.log(`   ✅ Successfully migrated ${successCount}/${data.length} records`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting reference data migration from dev to production");
  console.log(`   Dev:  ${DEV_URL}`);
  console.log(`   Prod: ${PROD_URL}`);
  
  try {
    // Migrate each table
    await migrateTable("ethnicities");
    await migrateTable("majorCategories");
    await migrateTable("schools");
    
    console.log("\n✅ Migration completed successfully!");
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main();

