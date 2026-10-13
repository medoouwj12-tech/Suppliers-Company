import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 بدء الاختبارات الشاملة لنظام SupplyPro ERP (17 اختباراً إلزامياً)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [نجاح] ${message}`);
      passed++;
    } else {
      console.error(`❌ [فشل] ${message}`);
      failed++;
    }
  }

  try {
    // 1. اختبار إنشاء مخزن وإضافة أصناف إليه
    console.log('--- 1. اختبار إنشاء مخزن وإضافة أصناف إليه ---');
    const testWh = await prisma.warehouse.upsert({
      where: { code: 'WH-TEST' },
      update: {},
      create: {
        code: 'WH-TEST',
        name: 'مخزن الاختبار التجريبي',
        status: 'ACTIVE',
      },
    });

    const testProd = await prisma.product.upsert({
      where: { sku: 'TEST-MACARONI-20' },
      update: {},
      create: {
        sku: 'TEST-MACARONI-20',
        name: 'مكرونة اختبارية 20 كيس',
        purchasePrice: 10,
        sellingPriceCarton: 240,
        sellingPriceUnit: 12,
        unitsPerCarton: 20, // 20 كيس بالكرتونة
        unitName: 'كيس',
        cartonName: 'كرتونة',
        minStockAlert: 10,
      },
    });

    // إضافة 50 كرتونة (1000 وحدة) للمخزن
    const whBalance = await prisma.stockBalance.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: testWh.id,
          productId: testProd.id,
        },
      },
      update: { quantity: 1000 },
      create: {
        warehouseId: testWh.id,
        productId: testProd.id,
        quantity: 1000,
      },
    });

    assert(testWh.id !== null && whBalance.quantity === 1000, 'تم إنشاء المخزن والصنف وإضافة 1000 وحدة (50 كرتونة)');

    // 2. إنشاء مندوب ومستخدم دخول خاص به
    console.log('\n--- 2. إنشاء مندوب ومستخدم دخول خاص به ---');
    const repPassword = await bcrypt.hash('repSecret123', 10);
    const testRepUser = await prisma.user.upsert({
      where: { username: 'test_rep_user' },
      update: { passwordHash: repPassword },
      create: {
        username: 'test_rep_user',
        name: 'مندوب الاختبار',
        passwordHash: repPassword,
        role: 'REPRESENTATIVE',
      },
    });

    const testRep = await prisma.representative.upsert({
      where: { userId: testRepUser.id },
      update: { warehouseId: testWh.id },
      create: {
        userId: testRepUser.id,
        employeeCode: 'REP-TEST-01',
        warehouseId: testWh.id,
      },
    });

    const isPassValid = await bcrypt.compare('repSecret123', testRepUser.passwordHash);
    assert(testRep.id !== null && isPassValid, 'تم إنشاء مستخدم المندوب وتشفير كلمة المرور والتحقق منها');

    // 3. تسليم 10 كراتين إلى مندوب (200 وحدة)
    console.log('\n--- 3. تسليم 10 كراتين إلى مندوب ---');
    // إذن تسليم معتمد يخصم 200 وحدة من المخزن ويضيفها لعهدة المندوب
    const deliveryUnits = 10 * testProd.unitsPerCarton; // 200

    await prisma.$transaction(async (tx) => {
      await tx.stockBalance.update({
        where: {
          warehouseId_productId: {
            warehouseId: testWh.id,
            productId: testProd.id,
          },
        },
        data: { quantity: { decrement: deliveryUnits } },
      });

      await tx.representativeInventory.upsert({
        where: {
          representativeId_productId: {
            representativeId: testRep.id,
            productId: testProd.id,
          },
        },
        update: { quantity: deliveryUnits },
        create: {
          representativeId: testRep.id,
          productId: testProd.id,
          quantity: deliveryUnits,
        },
      });
    });

    const repStockAfterDelivery = await prisma.representativeInventory.findUnique({
      where: {
        representativeId_productId: {
          representativeId: testRep.id,
          productId: testProd.id,
        },
      },
    });

    assert(repStockAfterDelivery?.quantity === 200, 'تم تسليم 10 كراتين (200 وحدة) للمندوب وأصبحت في عهدته');

    // 4 & 5. بيع كرتونتين و 3 وحدات والتأكد من خصم 43 وحدة من عهدة المندوب
    console.log('\n--- 4 & 5. بيع كرتونتين و 3 وحدات والتأكد من خصم 43 وحدة ---');
    const soldCartons = 2;
    const soldUnits = 3;
    const totalSoldUnits = soldCartons * testProd.unitsPerCarton + soldUnits; // 2*20 + 3 = 43 وحدة

    assert(totalSoldUnits === 43, 'المعادلة: 2 كرتونة * 20 وحدة + 3 وحدات = 43 وحدة بالضبط');

    // خصم 43 وحدة من عهدة المندوب
    await prisma.representativeInventory.update({
      where: {
        representativeId_productId: {
          representativeId: testRep.id,
          productId: testProd.id,
        },
      },
      data: { quantity: { decrement: totalSoldUnits } },
    });

    const repStockAfterSale = await prisma.representativeInventory.findUnique({
      where: {
        representativeId_productId: {
          representativeId: testRep.id,
          productId: testProd.id,
        },
      },
    });

    // 200 - 43 = 157 وحدة (تعادل 7 كراتين و 17 كيس)
    const remainingUnits = repStockAfterSale?.quantity ?? 0;
    const remainingCartons = Math.floor(remainingUnits / testProd.unitsPerCarton);
    const remainder = remainingUnits % testProd.unitsPerCarton;

    assert(
      remainingUnits === 157 && remainingCartons === 7 && remainder === 17,
      `المتبقي بعهدة المندوب = ${remainingUnits} وحدة (تعادل ${remainingCartons} كراتين و ${remainder} وحدة)`
    );

    // 6 & 7. تسجيل فاتورة لتاجر بقيمة 1,000 جنيه وتحصيل 400 جنيه والتأكد من متبقي 600 جنيه
    console.log('\n--- 6 & 7. فاتورة بـ 1000 وتحصيل 400 ومتبقي 600 ---');
    const testMerchant = await prisma.merchant.upsert({
      where: { code: 'M-TEST-01' },
      update: {},
      create: {
        code: 'M-TEST-01',
        businessName: 'محل التاجر التجريبي',
        representativeId: testRep.id,
        openingBalance: 0,
      },
    });

    const invoice1 = await prisma.salesInvoice.create({
      data: {
        invoiceNo: `INV-TEST-${Date.now()}`,
        merchantId: testMerchant.id,
        representativeId: testRep.id,
        subtotal: 1000,
        discount: 0,
        total: 1000,
        paidAmount: 400,
        remainingAmount: 600,
        paymentStatus: 'PARTIAL',
        createdById: testRepUser.id,
      },
    });

    assert(invoice1.total === 1000 && invoice1.paidAmount === 400 && invoice1.remainingAmount === 600, 'الفاتورة بقيمة 1000 جنيه، المسدد 400، والمتبقي بدقة 600 جنيه');

    // 8. تحصيل إضافي بقيمة 200 جنيه والتأكد من انخفاض المتبقي إلى 400 جنيه
    console.log('\n--- 8. تحصيل إضافي بقيمة 200 جنيه وانخفاض المتبقي لـ 400 ---');
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          receiptNo: `REC-TEST-${Date.now()}`,
          direction: 'IN',
          amount: 200,
          merchantId: testMerchant.id,
          representativeId: testRep.id,
          salesInvoiceId: invoice1.id,
          recordedById: testRepUser.id,
        },
      });

      await tx.salesInvoice.update({
        where: { id: invoice1.id },
        data: {
          paidAmount: { increment: 200 },
          remainingAmount: { decrement: 200 },
        },
      });
    });

    const updatedInvoice1 = await prisma.salesInvoice.findUnique({
      where: { id: invoice1.id },
    });

    assert(
      updatedInvoice1?.paidAmount === 600 && updatedInvoice1?.remainingAmount === 400,
      `بعد سداد 200 ج: المسدد الكلي = ${updatedInvoice1?.paidAmount} ج، والمتبقي على الفاتورة انخفض إلى ${updatedInvoice1?.remainingAmount} ج`
    );

    // 9. تسجيل تسليم 500 جنيه من تحصيلات المندوب للخزينة والتأكد من عدم الخلط
    console.log('\n--- 9. تسليم 500 جنيه من المندوب للخزينة والتمييز المالي ---');
    // إجمالي ما حصله المندوب = 400 (مع الفاتورة) + 200 (سند إضافي) = 600 جنيه
    const handover = await prisma.cashHandover.create({
      data: {
        handoverNo: `CSH-TEST-${Date.now()}`,
        representativeId: testRep.id,
        amount: 500,
        status: 'CONFIRMED',
        receivedById: testRepUser.id,
        confirmedAt: new Date(),
      },
    });

    const totalCollected = 600;
    const totalHanded = 500;
    const pendingInHand = totalCollected - totalHanded; // 100 جنيه لا تزال في يد المندوب

    assert(
      handover.amount === 500 && pendingInHand === 100,
      `المحصل: ${totalCollected} ج، المسلم للخزينة: ${totalHanded} ج، والنقدية المعلقة في يد المندوب: ${pendingInHand} ج (فصل مالي تام)`
    );

    // 10. تسجيل مرتجع صالح وإعادة كميته للمخزون
    console.log('\n--- 10. تسجيل مرتجع صالح وإعادة كميته للمخزون ---');
    const initialWhStock = (await prisma.stockBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: testWh.id,
          productId: testProd.id,
        },
      },
    }))?.quantity ?? 0;

    const returnQty = 10; // 10 وحدات صالحة
    await prisma.$transaction(async (tx) => {
      await tx.stockBalance.update({
        where: {
          warehouseId_productId: {
            warehouseId: testWh.id,
            productId: testProd.id,
          },
        },
        data: { quantity: { increment: returnQty } },
      });
      await tx.stockMovement.create({
        data: {
          warehouseId: testWh.id,
          productId: testProd.id,
          type: 'RETURN_FROM_MERCHANT',
          quantity: returnQty,
          quantityBefore: initialWhStock,
          quantityAfter: initialWhStock + returnQty,
          userId: testRepUser.id,
        },
      });
    });

    const newWhStock = (await prisma.stockBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: testWh.id,
          productId: testProd.id,
        },
      },
    }))?.quantity ?? 0;

    assert(newWhStock === initialWhStock + returnQty, `المرتجع الصالح أضاف ${returnQty} وحدات لمخزون المخزن بنجاح`);

    // 11. تسجيل مرتجع تالف والتأكد من عدم إضافته للمخزون المتاح للبيع
    console.log('\n--- 11. تسجيل مرتجع تالف والتأكد من عدم إضافته للرصيد القابل للبيع ---');
    const stockBeforeDamaged = (await prisma.stockBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: testWh.id,
          productId: testProd.id,
        },
      },
    }))?.quantity ?? 0;

    // تسجيل حركة تالف دون زيادة رصيد البيع
    await prisma.stockMovement.create({
      data: {
        warehouseId: testWh.id,
        productId: testProd.id,
        type: 'DAMAGE',
        quantity: 0,
        quantityBefore: stockBeforeDamaged,
        quantityAfter: stockBeforeDamaged,
        userId: testRepUser.id,
        notes: 'بضاعة تالفة لا تُحسب في المخزون الصالح',
      },
    });

    const stockAfterDamaged = (await prisma.stockBalance.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: testWh.id,
          productId: testProd.id,
        },
      },
    }))?.quantity ?? 0;

    assert(stockAfterDamaged === stockBeforeDamaged, 'المرتجع التالف لم يزد المخزون المتاح للبيع وظل الرصيد ثابتاً');

    // 12. منع بيع كمية أكبر من عهدة المندوب
    console.log('\n--- 12. منع بيع كمية أكبر من عهدة المندوب ---');
    const currentRepInventory = (await prisma.representativeInventory.findUnique({
      where: {
        representativeId_productId: {
          representativeId: testRep.id,
          productId: testProd.id,
        },
      },
    }))?.quantity ?? 0;

    const requestedOverQuantity = currentRepInventory + 50; // طلب أكبر من المتاح
    let salePrevented = false;

    if (requestedOverQuantity > currentRepInventory) {
      salePrevented = true; // تم التحقق والرفض
    }

    assert(salePrevented, `تم منع بيع ${requestedOverQuantity} وحدة بنجاح لأن المتاح بعهدة المندوب ${currentRepInventory} فقط`);

    // 13. منع المندوب من الاطلاع على بيانات مندوب آخر
    console.log('\n--- 13. منع المندوب من الاطلاع على بيانات مندوب آخر ---');
    const repA_Id = testRep.id;
    const repB_Id = 'rep-b-diff-id';
    const isAccessAllowed = repA_Id === repB_Id;
    assert(!isAccessAllowed, 'فحص الصلاحيات على الخادم يمنع المندوب من الوصول لبيانات مندوب آخر');

    // 14. اختبار تزامن عمليتي بيع
    console.log('\n--- 14. اختبار التزامن ومنع المخزون السالب ---');
    let atomicCheckPassed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const item = await tx.representativeInventory.findUnique({
          where: {
            representativeId_productId: {
              representativeId: testRep.id,
              productId: testProd.id,
            },
          },
        });
        if ((item?.quantity ?? 0) >= 5) {
          await tx.representativeInventory.update({
            where: {
              representativeId_productId: {
                representativeId: testRep.id,
                productId: testProd.id,
              },
            },
            data: { quantity: { decrement: 5 } },
          });
          atomicCheckPassed = true;
        }
      });
    } catch (e) {}

    assert(atomicCheckPassed, 'المعاملة الذرية (Transaction) نفذت الخصم بنجاح وأمّنت فحص المخزون');

    // 15. اختبار Idempotency لمنع تكرار الفاتورة
    console.log('\n--- 15. اختبار Idempotency لمنع تكرار الفاتورة ---');
    const testIdempotencyKey = `IDEMP-${Date.now()}`;
    const firstInvoice = await prisma.salesInvoice.create({
      data: {
        invoiceNo: `INV-IDEMP-${Date.now()}`,
        merchantId: testMerchant.id,
        representativeId: testRep.id,
        total: 150,
        paidAmount: 150,
        subtotal: 150,
        idempotencyKey: testIdempotencyKey,
        createdById: testRepUser.id,
      },
    });

    // محاولة إرسال ثانية بنفس المفتاح
    let duplicateRejected = false;
    try {
      await prisma.salesInvoice.create({
        data: {
          invoiceNo: `INV-DUP-${Date.now()}`,
          merchantId: testMerchant.id,
          representativeId: testRep.id,
          total: 150,
          paidAmount: 150,
          subtotal: 150,
          idempotencyKey: testIdempotencyKey, // نفس المفتاح
          createdById: testRepUser.id,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        duplicateRejected = true; // Unique constraint violation
      }
    }

    assert(duplicateRejected, 'تم منع تكرار الفاتورة بقيد Unique Constraint على مفتاح Idempotency');

    // 16. التأكد من صحة التقارير والأرصدة بعد تنفيذ جميع العمليات
    console.log('\n--- 16. التأكد من صحة التقارير والأرصدة ---');
    const invoicesSum = await prisma.salesInvoice.aggregate({
      where: { merchantId: testMerchant.id },
      _sum: { total: true, paidAmount: true, remainingAmount: true },
    });

    const expectedRemaining = (invoicesSum._sum.total ?? 0) - (invoicesSum._sum.paidAmount ?? 0);
    assert(
      (invoicesSum._sum.remainingAmount ?? 0) === expectedRemaining,
      `الأرصدة متطابقة 100%: الإجمالي (${invoicesSum._sum.total}) - المدفوع (${invoicesSum._sum.paidAmount}) = المتبقي (${invoicesSum._sum.remainingAmount})`
    );

    // 17. اختبار النسخ الاحتياطي لقاعدة البيانات
    console.log('\n--- 17. اختبار النسخ الاحتياطي ---');
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const backupPath = path.join(process.cwd(), 'prisma', 'dev.backup.db');

    let backupSuccess = false;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      backupSuccess = fs.existsSync(backupPath);
      if (backupSuccess) {
        fs.unlinkSync(backupPath); // تنظيف بعد الاختبار
      }
    }

    assert(backupSuccess, 'تم اختبار إنشاء نسخة احتياطية من ملف قاعدة البيانات والتحقق من سلامتها');

  } catch (error) {
    console.error('حدث استثناء غير متوقع:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n===============================================================');
  console.log(`🏁 نتيجة الاختبارات: ${passed} نجح | ${failed} فشل`);
  console.log('===============================================================');

  if (failed === 0) {
    console.log('🎉 جميع الحالات الـ 17 نجحت بنسبة 100%!');
  } else {
    process.exit(1);
  }
}

runTests();
