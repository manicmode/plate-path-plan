#!/usr/bin/env node

/**
 * Partner content ingestion script
 * Usage: npx tsx scripts/ingest-partner.ts <vendor> <catalog.csv> <tips.csv>
 * 
 * CSV Format:
 * catalog.csv: slug,name,shortDesc,imageUrl,tags,defaultPrice
 * tips.csv: id,productSlug,title,blurb,tag,priority,ctaUrl?,sponsorName?,disclosure?
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CatalogCSVRow {
  slug: string;
  name: string;
  shortDesc?: string;
  imageUrl?: string;
  tags?: string;
  defaultPrice?: string;
}

interface TipCSVRow {
  id: string;
  productSlug: string;
  title: string;
  blurb: string;
  tag?: string;
  priority?: string;
  ctaUrl?: string;
  sponsorName?: string;
  disclosure?: string;
}

function processCatalog(csvPath: string) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { 
    columns: true, 
    skip_empty_lines: true 
  }) as CatalogCSVRow[];

  return records.map(row => ({
    slug: row.slug,
    name: row.name,
    shortDesc: row.shortDesc || undefined,
    imageUrl: row.imageUrl || undefined,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()) : undefined,
    defaultPrice: row.defaultPrice ? parseFloat(row.defaultPrice) : undefined
  }));
}

function processTips(csvPath: string, vendor: string) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { 
    columns: true, 
    skip_empty_lines: true 
  }) as TipCSVRow[];

  return records.map(row => ({
    id: row.id,
    productSlug: row.productSlug,
    title: row.title,
    blurb: row.blurb,
    tag: row.tag || undefined,
    priority: row.priority ? parseInt(row.priority) : undefined,
    sponsor: (row.ctaUrl || row.sponsorName) ? {
      name: row.sponsorName || vendor,
      url: row.ctaUrl || undefined,
      disclosure: row.disclosure || undefined
    } : undefined
  }));
}

function main() {
  const [vendor, catalogPath, tipsPath] = process.argv.slice(2);
  
  if (!vendor || !catalogPath || !tipsPath) {
    console.error('Usage: npx tsx scripts/ingest-partner.ts <vendor> <catalog.csv> <tips.csv>');
    process.exit(1);
  }

  try {
    const catalog = processCatalog(catalogPath);
    const tips = processTips(tipsPath, vendor);

    const outputDir = path.join('src/content/partners', vendor);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      path.join(outputDir, 'catalog.json'),
      JSON.stringify(catalog, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, 'tips.json'),
      JSON.stringify(tips, null, 2)
    );

    console.log(`✅ Ingested ${catalog.length} catalog items and ${tips.length} tips for ${vendor}`);
    console.log(`📁 Files written to: ${outputDir}`);
    console.log(`🚀 Enable with: NEXT_PUBLIC_PARTNER_${vendor.toUpperCase()}=1`);

  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}