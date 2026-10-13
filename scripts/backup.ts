import fs from 'fs';
import path from 'path';

/**
 * SupplyPro ERP - Database Backup Utility
 * يقوم بعمل نسخة احتياطية فورية لملف قاعدة البيانات في مجلد backups/ مع ختم زمني دقيق
 */
async function runBackup() {
  const projectRoot = process.cwd();
  const dbPath = path.join(projectRoot, 'prisma', 'dev.db');
  const backupDir = path.join(projectRoot, 'backups');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ لم يتم العثور على ملف قاعدة البيانات:', dbPath);
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `supplypro_backup_${timestamp}.db`;
  const backupFilePath = path.join(backupDir, backupFileName);

  fs.copyFileSync(dbPath, backupFilePath);

  const stats = fs.statSync(backupFilePath);
  console.log('====================================================');
  console.log('✅ تم إنشاء النسخة الاحتياطية بنجاح!');
  console.log(`📁 المسار: ${backupFilePath}`);
  console.log(`📦 الحجم: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`🕒 التوقيت: ${new Date().toLocaleString('ar-EG')}`);
  console.log('====================================================');
}

runBackup().catch((err) => {
  console.error('فشل النسخ الاحتياطي:', err);
  process.exit(1);
});
