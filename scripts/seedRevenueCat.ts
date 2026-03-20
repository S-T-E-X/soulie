import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "replit-revenuecat-v2";

const PROJECT_NAME = "Soulie";

const APP_STORE_APP_NAME = "Soulie iOS";
const APP_STORE_BUNDLE_ID = "com.soulie";
const PLAY_STORE_APP_NAME = "Soulie Android";
const PLAY_STORE_PACKAGE_NAME = "com.soulie";

const ENTITLEMENT_VIP_IDENTIFIER = "vip";
const ENTITLEMENT_VIP_DISPLAY_NAME = "VIP Access";

const VIP_OFFERING_IDENTIFIER = "default";
const VIP_OFFERING_DISPLAY_NAME = "Soulie VIP";

const COINS_OFFERING_IDENTIFIER = "coins";
const COINS_OFFERING_DISPLAY_NAME = "Soulie Coins";

const SUBSCRIPTIONS = [
  {
    testId: "com.soulie.vip.weekly",
    appStoreId: "com.soulie.vip.weekly",
    playStoreId: "com.soulie.vip.weekly:weekly",
    displayName: "VIP Weekly",
    duration: "P1W" as const,
    packageKey: "$rc_weekly",
    packageName: "Weekly VIP",
    testPrice: 999_000,
  },
  {
    testId: "com.soulie.vip.monthly",
    appStoreId: "com.soulie.vip.monthly",
    playStoreId: "com.soulie.vip.monthly:monthly",
    displayName: "VIP Monthly",
    duration: "P1M" as const,
    packageKey: "$rc_monthly",
    packageName: "Monthly VIP",
    testPrice: 1499_000,
  },
  {
    testId: "com.soulie.vip.yearly",
    appStoreId: "com.soulie.vip.yearly",
    playStoreId: "com.soulie.vip.yearly:yearly",
    displayName: "VIP Yearly",
    duration: "P1Y" as const,
    packageKey: "$rc_annual",
    packageName: "Yearly VIP",
    testPrice: 7999_000,
  },
];

const COIN_PRODUCTS = [
  {
    testId: "com.soulie.coins.100",
    appStoreId: "com.soulie.coins.100",
    playStoreId: "com.soulie.coins.100",
    displayName: "100 Coins",
    packageKey: "coins_100",
    packageName: "100 Coins",
    testPrice: 990_000,
  },
  {
    testId: "com.soulie.coins.550",
    appStoreId: "com.soulie.coins.550",
    playStoreId: "com.soulie.coins.550",
    displayName: "550 Coins",
    packageKey: "coins_550",
    packageName: "550 Coins",
    testPrice: 999_000,
  },
  {
    testId: "com.soulie.coins.1400",
    appStoreId: "com.soulie.coins.1400",
    playStoreId: "com.soulie.coins.1400",
    displayName: "1400 Coins",
    packageKey: "coins_1400",
    packageName: "1400 Coins",
    testPrice: 999_000,
  },
  {
    testId: "com.soulie.coins.3750",
    appStoreId: "com.soulie.coins.3750",
    playStoreId: "com.soulie.coins.3750",
    displayName: "3750 Coins",
    packageKey: "coins_3750",
    packageName: "3750 Coins",
    testPrice: 1999_000,
  },
  {
    testId: "com.soulie.coins.12000",
    appStoreId: "com.soulie.coins.12000",
    playStoreId: "com.soulie.coins.12000",
    displayName: "12000 Coins",
    packageKey: "coins_12000",
    packageName: "12000 Coins",
    testPrice: 4999_000,
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  console.log("Test store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  async function ensureProduct(
    targetApp: App,
    label: string,
    storeId: string,
    displayName: string,
    isTestStore: boolean,
    duration?: "P1W" | "P1M" | "P1Y",
    isNonConsumable?: boolean
  ): Promise<Product> {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeId && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`  ${label} product already exists: ${existing.id}`);
      return existing;
    }

    const productType = duration ? "subscription" : "consumable";
    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: targetApp.id,
      display_name: displayName,
      type: productType,
    };
    if (isTestStore) {
      body.title = displayName;
      if (duration) {
        body.subscription = { duration };
      }
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) {
      console.error(`  Failed to create ${label} product:`, error);
      throw new Error(`Failed to create ${label} product`);
    }
    console.log(`  Created ${label} product: ${created.id}`);
    return created;
  }

  async function setTestStorePrice(productId: string, amountMicros: number) {
    const { data, error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: productId },
      body: { prices: [{ amount_micros: amountMicros, currency: "USD" }] },
    });
    if (error) {
      if ((error as any)?.type === "resource_already_exists") {
        console.log("  Test store prices already exist");
      } else {
        console.error("  Failed to set price:", error);
      }
    } else {
      console.log("  Test store price set:", amountMicros);
    }
  }

  console.log("\n=== Setting up VIP Subscriptions ===");
  const vipProductIds: string[] = [];

  for (const sub of SUBSCRIPTIONS) {
    console.log(`\n[${sub.displayName}]`);
    const testProd = await ensureProduct(testStoreApp, "Test Store", sub.testId, sub.displayName, true, sub.duration);
    await setTestStorePrice(testProd.id, sub.testPrice);
    const appProd = await ensureProduct(appStoreApp, "App Store", sub.appStoreId, sub.displayName, false, sub.duration);
    const playProd = await ensureProduct(playStoreApp, "Play Store", sub.playStoreId, sub.displayName, false, sub.duration);
    vipProductIds.push(testProd.id, appProd.id, playProd.id);
    sub["testProductId"] = testProd.id;
    sub["appStoreProductId"] = appProd.id;
    sub["playStoreProductId"] = playProd.id;
  }

  console.log("\n=== Setting up Coin Products ===");
  for (const coin of COIN_PRODUCTS) {
    console.log(`\n[${coin.displayName}]`);
    const testProd = await ensureProduct(testStoreApp, "Test Store", coin.testId, coin.displayName, true);
    await setTestStorePrice(testProd.id, coin.testPrice);
    const appProd = await ensureProduct(appStoreApp, "App Store", coin.appStoreId, coin.displayName, false);
    const playProd = await ensureProduct(playStoreApp, "Play Store", coin.playStoreId, coin.displayName, false);
    coin["testProductId"] = testProd.id;
    coin["appStoreProductId"] = appProd.id;
    coin["playStoreProductId"] = playProd.id;
  }

  console.log("\n=== Setting up VIP Entitlement ===");
  const { data: existingEntitlements, error: listEntErr } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntErr) throw new Error("Failed to list entitlements");

  let vipEntitlement: Entitlement;
  const existingVipEnt = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_VIP_IDENTIFIER);
  if (existingVipEnt) {
    console.log("VIP entitlement already exists:", existingVipEnt.id);
    vipEntitlement = existingVipEnt;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_VIP_IDENTIFIER, display_name: ENTITLEMENT_VIP_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create VIP entitlement");
    console.log("Created VIP entitlement:", newEnt.id);
    vipEntitlement = newEnt;
  }

  const { error: attachVipErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: vipEntitlement.id },
    body: { product_ids: vipProductIds },
  });
  if (attachVipErr && (attachVipErr as any)?.type !== "unprocessable_entity_error") {
    throw new Error("Failed to attach VIP products to entitlement");
  }
  console.log("VIP products attached to entitlement");

  console.log("\n=== Setting up VIP Offering ===");
  const { data: existingOfferings, error: listOffErr } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOffErr) throw new Error("Failed to list offerings");

  let vipOffering: Offering;
  const existingVipOff = existingOfferings.items?.find((o) => o.lookup_key === VIP_OFFERING_IDENTIFIER);
  if (existingVipOff) {
    console.log("VIP offering already exists:", existingVipOff.id);
    vipOffering = existingVipOff;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: VIP_OFFERING_IDENTIFIER, display_name: VIP_OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create VIP offering");
    console.log("Created VIP offering:", newOff.id);
    vipOffering = newOff;
  }

  if (!vipOffering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: vipOffering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set VIP offering as current");
    console.log("VIP offering set as current");
  }

  for (const sub of SUBSCRIPTIONS as any[]) {
    const { data: existingPkgs, error: listPkgErr } = await listPackages({
      client,
      path: { project_id: project.id, offering_id: vipOffering.id },
      query: { limit: 20 },
    });
    if (listPkgErr) throw new Error("Failed to list packages");

    let pkg: Package;
    const existingPkg = existingPkgs.items?.find((p) => p.lookup_key === sub.packageKey);
    if (existingPkg) {
      console.log(`Package ${sub.packageKey} already exists:`, existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: vipOffering.id },
        body: { lookup_key: sub.packageKey, display_name: sub.packageName },
      });
      if (error) throw new Error(`Failed to create package ${sub.packageKey}`);
      console.log(`Created package ${sub.packageKey}:`, newPkg.id);
      pkg = newPkg;
    }

    const { error: attachErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: sub.testProductId, eligibility_criteria: "all" },
          { product_id: sub.appStoreProductId, eligibility_criteria: "all" },
          { product_id: sub.playStoreProductId, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachErr) {
      const msg = (attachErr as any)?.message ?? "";
      if (msg.includes("Cannot attach") || (attachErr as any)?.type === "unprocessable_entity_error") {
        console.log(`Products already attached to package ${sub.packageKey} (skipping)`);
      } else {
        throw new Error(`Failed to attach products to package ${sub.packageKey}: ${msg}`);
      }
    } else {
      console.log(`Products attached to package ${sub.packageKey}`);
    }
  }

  console.log("\n=== Setting up Coins Offering ===");
  let coinsOffering: Offering;
  const { data: refreshedOfferings } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  const existingCoinsOff = refreshedOfferings?.items?.find((o) => o.lookup_key === COINS_OFFERING_IDENTIFIER);
  if (existingCoinsOff) {
    console.log("Coins offering already exists:", existingCoinsOff.id);
    coinsOffering = existingCoinsOff;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: COINS_OFFERING_IDENTIFIER, display_name: COINS_OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create coins offering");
    console.log("Created coins offering:", newOff.id);
    coinsOffering = newOff;
  }

  for (const coin of COIN_PRODUCTS as any[]) {
    const { data: existingPkgs, error: listPkgErr } = await listPackages({
      client,
      path: { project_id: project.id, offering_id: coinsOffering.id },
      query: { limit: 20 },
    });
    if (listPkgErr) throw new Error("Failed to list coin packages");

    let pkg: Package;
    const existingPkg = existingPkgs.items?.find((p) => p.lookup_key === coin.packageKey);
    if (existingPkg) {
      console.log(`Coin package ${coin.packageKey} already exists:`, existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: coinsOffering.id },
        body: { lookup_key: coin.packageKey, display_name: coin.packageName },
      });
      if (error) throw new Error(`Failed to create coin package ${coin.packageKey}`);
      console.log(`Created coin package ${coin.packageKey}:`, newPkg.id);
      pkg = newPkg;
    }

    const { error: attachErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: coin.testProductId, eligibility_criteria: "all" },
          { product_id: coin.appStoreProductId, eligibility_criteria: "all" },
          { product_id: coin.playStoreProductId, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachErr) {
      const msg = (attachErr as any)?.message ?? "";
      if (msg.includes("Cannot attach") || (attachErr as any)?.type === "unprocessable_entity_error") {
        console.log(`Products already attached to coin package ${coin.packageKey} (skipping)`);
      } else {
        throw new Error(`Failed to attach products to coin package ${coin.packageKey}: ${msg}`);
      }
    } else {
      console.log(`Products attached to coin package ${coin.packageKey}`);
    }
  }

  const { data: testApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: testStoreApp.id },
  });
  const { data: appStoreApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  const { data: playStoreApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Public API Keys - Test Store:", testApiKeys?.items.map((i: any) => i.key).join(", ") ?? "N/A");
  console.log("Public API Keys - App Store:", appStoreApiKeys?.items.map((i: any) => i.key).join(", ") ?? "N/A");
  console.log("Public API Keys - Play Store:", playStoreApiKeys?.items.map((i: any) => i.key).join(", ") ?? "N/A");
  console.log("\nREVENUECAT_PROJECT_ID=" + project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID=" + testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID=" + appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + playStoreApp.id);
  console.log("====================\n");
}

seedRevenueCat().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
