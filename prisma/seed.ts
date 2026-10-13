import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 جاري تجهيز البيانات الأولية...');

  // 1. إعدادات الشركة
  await prisma.companySettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      name: 'SupplyPro ERP',
      nameAr: 'شركة النور للتوريدات الغذائية بالجملة',
      address: 'القاهرة، المنطقة الصناعية - التجمع الخامس',
      phone: '01012345678',
      email: 'info@supplypro-erp.com',
      taxNumber: '123-456-789',
      currency: 'EGP',
      currencySymbol: 'ج.م',
      defaultCreditDays: 30,
      allowNegativeStock: false,
    },
  });

  // 2. إنشاء المخازن الثلاثة
  const whMain = await prisma.warehouse.upsert({
    where: { code: 'WH-01' },
    update: {},
    create: {
      code: 'WH-01',
      name: 'المخزن الرئيسي - القاهرة',
      address: 'المنطقة الصناعية، التجمع الخامس',
      phone: '01122334455',
      status: 'ACTIVE',
      notes: 'المخزن المركزي لجميع البضائع',
    },
  });

  const whDelta = await prisma.warehouse.upsert({
    where: { code: 'WH-02' },
    update: {},
    create: {
      code: 'WH-02',
      name: 'مخزن الدلتا - طنطا',
      address: 'طريق المحلة السريع، طنطا',
      phone: '01233445566',
      status: 'ACTIVE',
      notes: 'مخزن قطاع محافظات الدلتا',
    },
  });

  const whUpper = await prisma.warehouse.upsert({
    where: { code: 'WH-03' },
    update: {},
    create: {
      code: 'WH-03',
      name: 'مخزن الصعيد - أسيوط',
      address: 'المنطقة الصناعية، عرب العوامر',
      phone: '01544556677',
      status: 'ACTIVE',
      notes: 'مخزن توزيع محافظات الصعيد',
    },
  });

  // 3. المستخدمون (المدير والمندوبين)
  const adminPassword = await bcrypt.hash('admin123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPassword },
    create: {
      username: 'admin',
      email: 'admin@supplypro.com',
      name: 'أحمد إبراهيم (المدير العام)',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '01000000001',
    },
  });

  const rep1Password = await bcrypt.hash('rep123456', 10);
  const rep1User = await prisma.user.upsert({
    where: { username: 'rep1' },
    update: { passwordHash: rep1Password },
    create: {
      username: 'rep1',
      email: 'rep1@supplypro.com',
      name: 'محمود عبد الرحمن (مندوب الجيزة)',
      passwordHash: rep1Password,
      role: 'REPRESENTATIVE',
      status: 'ACTIVE',
      phone: '01022222221',
    },
  });

  const rep2Password = await bcrypt.hash('rep123456', 10);
  const rep2User = await prisma.user.upsert({
    where: { username: 'rep2' },
    update: { passwordHash: rep2Password },
    create: {
      username: 'rep2',
      email: 'rep2@supplypro.com',
      name: 'سامح حسن (مندوب القاهرة)',
      passwordHash: rep2Password,
      role: 'REPRESENTATIVE',
      status: 'ACTIVE',
      phone: '01033333331',
    },
  });

  // سجل المندوبين
  const rep1 = await prisma.representative.upsert({
    where: { userId: rep1User.id },
    update: { warehouseId: whMain.id },
    create: {
      userId: rep1User.id,
      employeeCode: 'REP-001',
      phone: rep1User.phone,
      warehouseId: whMain.id,
    },
  });

  const rep2 = await prisma.representative.upsert({
    where: { userId: rep2User.id },
    update: { warehouseId: whMain.id },
    create: {
      userId: rep2User.id,
      employeeCode: 'REP-002',
      phone: rep2User.phone,
      warehouseId: whMain.id,
    },
  });

  // 4. التصنيفات
  const catPasta = await prisma.productCategory.upsert({
    where: { name: 'مكرونة وبقوليات' },
    update: {},
    create: { name: 'مكرونة وبقوليات', nameAr: 'مكرونة وبقوليات', color: 'orange' },
  });

  const catOil = await prisma.productCategory.upsert({
    where: { name: 'زيوت وسمن' },
    update: {},
    create: { name: 'زيوت وسمن', nameAr: 'زيوت وسمن', color: 'yellow' },
  });

  const catSugar = await prisma.productCategory.upsert({
    where: { name: 'سكر وأرز' },
    update: {},
    create: { name: 'سكر وأرز', nameAr: 'سكر وأرز', color: 'blue' },
  });

  const catDairy = await prisma.productCategory.upsert({
    where: { name: 'أجبان وألبان' },
    update: {},
    create: { name: 'أجبان وألبان', nameAr: 'أجبان وألبان', color: 'cyan' },
  });

  const catCanned = await prisma.productCategory.upsert({
    where: { name: 'صلصة ومعلبات' },
    update: {},
    create: { name: 'صلصة ومعلبات', nameAr: 'صلصة ومعلبات', color: 'red' },
  });

  // 5. المنتجات الغذائية (بكرتونة ووحدات دقيقة)
  const productsData = [
    {
      sku: 'PASTA-HAWA-400G',
      name: 'مكرونة حواء مقصوصة 400 جم',
      categoryId: catPasta.id,
      brand: 'حواء',
      purchasePrice: 10.0,
      sellingPriceUnit: 12.0,
      sellingPriceCarton: 230.0,
      unitsPerCarton: 20, // 20 كيس بالكرتونة
      unitName: 'كيس',
      cartonName: 'كرتونة',
      minStockAlert: 100, // 5 كراتين
      initialUnits: 1000, // 50 كرتونة
    },
    {
      sku: 'OIL-CRYSTAL-800ML',
      name: 'زيت كريستال ذرة نقي 800 مل',
      categoryId: catOil.id,
      brand: 'كريستال',
      purchasePrice: 65.0,
      sellingPriceUnit: 74.0,
      sellingPriceCarton: 860.0,
      unitsPerCarton: 12, // 12 زجاجة بالكرتونة
      unitName: 'زجاجة',
      cartonName: 'كرتونة',
      minStockAlert: 60,
      initialUnits: 600, // 50 كرتونة
    },
    {
      sku: 'SUGAR-OSRA-1KG',
      name: 'سكر الأسرة الأبيض الممتاز 1 كجم',
      categoryId: catSugar.id,
      brand: 'الأسرة',
      purchasePrice: 30.0,
      sellingPriceUnit: 35.0,
      sellingPriceCarton: 340.0,
      unitsPerCarton: 10, // 10 أكياس بالتكتل/الكرتونة
      unitName: 'كيس',
      cartonName: 'باكتة',
      minStockAlert: 100,
      initialUnits: 800,
    },
    {
      sku: 'RICE-SAAA-1KG',
      name: 'أرز الساعة عريض الحبة 1 كجم',
      categoryId: catSugar.id,
      brand: 'الساعة',
      purchasePrice: 32.0,
      sellingPriceUnit: 38.0,
      sellingPriceCarton: 370.0,
      unitsPerCarton: 10,
      unitName: 'كيس',
      cartonName: 'شيكارة',
      minStockAlert: 80,
      initialUnits: 700,
    },
    {
      sku: 'SAUCE-HEINZ-360G',
      name: 'صلصة طماطم هاينز مركزة 360 جم',
      categoryId: catCanned.id,
      brand: 'هاينز',
      purchasePrice: 22.0,
      sellingPriceUnit: 26.0,
      sellingPriceCarton: 600.0,
      unitsPerCarton: 24, // 24 برطمان بالكرتونة
      unitName: 'برطمان',
      cartonName: 'كرتونة',
      minStockAlert: 96,
      initialUnits: 720,
    },
    {
      sku: 'CHEESE-DOMTY-500G',
      name: 'جبنة دومتي بلس فيتا 500 جم',
      categoryId: catDairy.id,
      brand: 'دومتي',
      purchasePrice: 38.0,
      sellingPriceUnit: 44.0,
      sellingPriceCarton: 1150.0,
      unitsPerCarton: 27, // 27 علبة بالكرتونة
      unitName: 'علبة',
      cartonName: 'كرتونة',
      minStockAlert: 81,
      initialUnits: 540,
    },
    {
      sku: 'TUNA-SUNSHINE-185G',
      name: 'تونة صن شاين قطع سهلة الفتح 185 جم',
      categoryId: catCanned.id,
      brand: 'صن شاين',
      purchasePrice: 48.0,
      sellingPriceUnit: 56.0,
      sellingPriceCarton: 2600.0,
      unitsPerCarton: 48, // 48 علبة بالكرتونة
      unitName: 'علبة',
      cartonName: 'كرتونة',
      minStockAlert: 96,
      initialUnits: 480,
    },
  ];

  const createdProducts: any[] = [];

  for (const p of productsData) {
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        purchasePrice: p.purchasePrice,
        sellingPriceUnit: p.sellingPriceUnit,
        sellingPriceCarton: p.sellingPriceCarton,
        unitsPerCarton: p.unitsPerCarton,
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        brand: p.brand,
        purchasePrice: p.purchasePrice,
        sellingPriceUnit: p.sellingPriceUnit,
        sellingPriceCarton: p.sellingPriceCarton,
        unitsPerCarton: p.unitsPerCarton,
        unitName: p.unitName,
        cartonName: p.cartonName,
        minStockAlert: p.minStockAlert,
        status: 'ACTIVE',
      },
    });

    createdProducts.push({ ...prod, initialUnits: p.initialUnits });

    // رصيد المخزن الرئيسي
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: whMain.id,
          productId: prod.id,
        },
      },
      update: { quantity: p.initialUnits },
      create: {
        warehouseId: whMain.id,
        productId: prod.id,
        quantity: p.initialUnits,
      },
    });

    // رصيد مخزن الدلتا (كميات أولية)
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: whDelta.id,
          productId: prod.id,
        },
      },
      update: {},
      create: {
        warehouseId: whDelta.id,
        productId: prod.id,
        quantity: Math.floor(p.initialUnits * 0.4),
      },
    });

    // رصيد مخزن الصعيد
    await prisma.stockBalance.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: whUpper.id,
          productId: prod.id,
        },
      },
      update: {},
      create: {
        warehouseId: whUpper.id,
        productId: prod.id,
        quantity: Math.floor(p.initialUnits * 0.3),
      },
    });
  }

  // 6. عهدة المندوب محمود (REP-001)
  // تسليم 10 كراتين مكرونة (200 كيس) و 5 كراتين زيت (60 زجاجة)
  const pastaProd = createdProducts[0];
  const oilProd = createdProducts[1];
  const sugarProd = createdProducts[2];

  await prisma.representativeInventory.upsert({
    where: {
      representativeId_productId: {
        representativeId: rep1.id,
        productId: pastaProd.id,
      },
    },
    update: { quantity: 200 }, // 10 كراتين * 20 كيس
    create: {
      representativeId: rep1.id,
      productId: pastaProd.id,
      quantity: 200,
    },
  });

  await prisma.representativeInventory.upsert({
    where: {
      representativeId_productId: {
        representativeId: rep1.id,
        productId: oilProd.id,
      },
    },
    update: { quantity: 60 }, // 5 كراتين * 12 زجاجة
    create: {
      representativeId: rep1.id,
      productId: oilProd.id,
      quantity: 60,
    },
  });

  await prisma.representativeInventory.upsert({
    where: {
      representativeId_productId: {
        representativeId: rep1.id,
        productId: sugarProd.id,
      },
    },
    update: { quantity: 50 }, // 5 باكتات * 10 أكياس
    create: {
      representativeId: rep1.id,
      productId: sugarProd.id,
      quantity: 50,
    },
  });

  // 7. التجار
  const m1 = await prisma.merchant.upsert({
    where: { code: 'M-101' },
    update: { representativeId: rep1.id },
    create: {
      code: 'M-101',
      businessName: 'سوبر ماركت الأمانة',
      ownerName: 'الحاج فاروق عبد الله',
      phone: '01099887766',
      address: 'شارع أحمد عرابي، المهندسين',
      area: 'المهندسين - الجيزة',
      openingBalance: 1500.0,
      creditLimit: 25000.0,
      representativeId: rep1.id,
      status: 'ACTIVE',
    },
  });

  const m2 = await prisma.merchant.upsert({
    where: { code: 'M-102' },
    update: { representativeId: rep1.id },
    create: {
      code: 'M-102',
      businessName: 'هايبر ماركت البركة',
      ownerName: 'الأستاذ عصام الشريف',
      phone: '01188776655',
      address: 'شارع الملك فيصل الرئيسي، العشرين',
      area: 'فيصل - الجيزة',
      openingBalance: 0.0,
      creditLimit: 50000.0,
      representativeId: rep1.id,
      status: 'ACTIVE',
    },
  });

  const m3 = await prisma.merchant.upsert({
    where: { code: 'M-103' },
    update: { representativeId: rep2.id },
    create: {
      code: 'M-103',
      businessName: 'بقالة وماركت التوفيق',
      ownerName: 'عم توفيق إبراهيم',
      phone: '01277665544',
      address: 'شارع شبرا الرئيسي، محطة مسرة',
      area: 'شبرا - القاهرة',
      openingBalance: 500.0,
      creditLimit: 15000.0,
      representativeId: rep2.id,
      status: 'ACTIVE',
    },
  });

  // 8. الموردون
  await prisma.supplier.upsert({
    where: { code: 'SUP-01' },
    update: {},
    create: {
      code: 'SUP-01',
      name: 'شركة صافولا للأغذية والزيوت',
      contactPerson: 'م. ممدوح رفعت',
      phone: '0223456789',
      address: 'مدينة 6 أكتوبر، المنطقة الصناعية',
      openingBalance: 45000.0,
      status: 'ACTIVE',
    },
  });

  await prisma.supplier.upsert({
    where: { code: 'SUP-02' },
    update: {},
    create: {
      code: 'SUP-02',
      name: 'شركة الدلتا للصناعات السكرية',
      contactPerson: 'أ. طارق عبد الوهاب',
      phone: '0224567890',
      address: 'كفر الشيخ، مصنع الحامول',
      openingBalance: 20000.0,
      status: 'ACTIVE',
    },
  });

  // 9. نموذج فاتورة بيع سابقة للتجربة
  const existingInv = await prisma.salesInvoice.findUnique({
    where: { invoiceNo: 'INV-2026-00001' },
  });

  if (!existingInv) {
    const inv = await prisma.salesInvoice.create({
      data: {
        invoiceNo: 'INV-2026-00001',
        merchantId: m1.id,
        representativeId: rep1.id,
        status: 'APPROVED',
        paymentStatus: 'PARTIAL',
        paymentType: 'PARTIAL',
        subtotal: 1000.0,
        discount: 0.0,
        total: 1000.0,
        paidAmount: 400.0,
        remainingAmount: 600.0,
        createdById: rep1User.id,
        notes: 'فاتورة توريد مكرونة وزيت تم تسليمها بالكامل',
        items: {
          create: [
            {
              productId: pastaProd.id,
              quantity: 43, // 2 كرتونة و 3 أكياس
              unitPrice: 12.0,
              cartonPrice: 230.0,
              unitsPerCarton: 20,
              total: 516.0,
            },
            {
              productId: oilProd.id,
              quantity: 7, // 7 زجاجات
              unitPrice: 70.0,
              cartonPrice: 860.0,
              unitsPerCarton: 12,
              total: 484.0,
            },
          ],
        },
        payments: {
          create: [
            {
              receiptNo: 'REC-2026-00001',
              direction: 'IN',
              paymentType: 'CASH',
              amount: 400.0,
              merchantId: m1.id,
              representativeId: rep1.id,
              recordedById: rep1User.id,
              notes: 'تحصيل نقدي فوري مع الفاتورة',
            },
          ],
        },
      },
    });

    console.log(`✅ تم إنشاء فاتورة تجريبية بنجاح: ${inv.invoiceNo}`);
  }

  console.log('🎉 تم ملء قاعدة البيانات بنجاح!');
  console.log('--------------------------------------------------');
  console.log('بيانات الدخول:');
  console.log('المدير: admin / admin123456');
  console.log('المندوب: rep1 / rep123456');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ خطأ أثناء الـ Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
