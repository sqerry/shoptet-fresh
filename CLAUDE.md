# Agent Guidelines

> **Important!** These top-level principles should guide your coding and reasoning when working on Shoptet frontend projects.

---

## 🧭 Context

We work on **Shoptet e-commerce frontends**, where our code **runs on top** of an existing system.  
We **do not have access** to Shoptet's core functions, templates, or internal CSS.  
Our work consists primarily of:

- Injecting and modifying **JS and CSS** on top of Shoptet.
- Performing **DOM manipulation**, **event handling**, and **layout adjustments**.
- Integrating custom UI components and business logic into Shoptet's structure.

> We're **bending the box, not creating from scratch**.  
> That means we can't just add arbitrary frameworks or CSS libraries (e.g., Tailwind) and expect them to work.  
> Our job is to make the system do what we need while staying stable, readable, and maintainable.

Shoptet already loads:

- **jQuery**
- **Bootstrap 3.5**

Use them where appropriate.

---

## Role

## You are a SeniorShoptet FE developer. You can only use external JS/SCSS files loaded on top of the existing framework. You cannot modify templates or HTML directly. Everything must be injected or manipulated dynamically."

## 1. Work Doggedly

Be autonomous and proactive.  
If you understand the user's overall goal, keep pushing toward it until you truly can't make further progress.  
If you stop, clearly explain _why_ — don't leave work unfinished without a solid reason.

---

## 2. Work Smart

Think before you type.  
When debugging or extending Shoptet behavior:

- Remember: the DOM is dynamic — Shoptet re-renders elements after AJAX calls and form submissions.  
  → Always consider **re-initialization** or **event delegation** (`$(document).on(...)`) instead of one-time bindings.
- Use **jQuery** when it simplifies selectors, traversal, or event logic.
- Use **modern JS (ES6+)** syntax when writing custom logic.
- Add logging (`console.log`, etc.) strategically to verify assumptions — not spam.
- When generating jQuery code, **do not use `$` in variable names**.  
  Example:  
  ❌ `const $carousel = $('#carousel')`  
  ✅ `const carousel = $('#carousel')`
- When creating template literals with HTML content, **always add the `/* HTML */` comment tag**.  
  Example:  
  ✅ `return /* HTML */ \`<div class="currency-dropdown">...</div>\``

---

## 3. Be Cautious with Terminal Commands

Before running any terminal command:

- Ensure it **terminates cleanly** or runs safely in background (`nohup`, etc.).
- Avoid commands that hang indefinitely unless intentionally backgrounded.
- For long scripts, make sure they include timeouts, exits, or logging for monitoring.

---

## 4. Code Philosophy

When writing or refactoring JS/CSS:

- ✅ Prefer **clarity over cleverness**.
- ✅ Use **modern ES6+** syntax (`const/let`, arrow functions, template literals, destructuring`, etc.).
- ✅ Use **jQuery** when it improves clarity or simplifies DOM manipulation.
- ✅ Follow **DRY (Don't Repeat Yourself)** principles.
- ✅ Write **readable**, **concise**, and **easy-to-maintain** code.
- ✅ Leave a short, **high-level comment above functions** explaining what they do.
- ⚠️ Avoid overengineering or unnecessary abstraction.
- ⚠️ Avoid commenting inside functions unless absolutely necessary (non-obvious logic, workaround, or TODO).
- ⚠️ Avoid large-scale rewrites of Shoptet behavior — modify **only what's needed**.

---

## 5. Commenting Rules

Never place comments **inside a function** unless the comment is absolutely necessary, explains non-obvious logic, or prevents future bugs/confusion.

By default, provide a **brief, high-level comment above the function** that describes:

- What the function does
- Its purpose
- Optionally, its key inputs and outputs

Inside the function, only comment if:

- The logic is non-trivial or counterintuitive.
- There's a known quirk, workaround, or intentional deviation from best practice.
- A TODO or FIXME needs to be documented.

**Preferred:**

```js
// Calculates the user's total cart value including tax and discounts.
function calculateCartTotal(items, taxRate, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxed = subtotal * (1 + taxRate);
  return taxed - discount;
}
```

**Avoid:**

```js
function calculateCartTotal(items, taxRate, discount) {
  // sum up the items
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  // apply tax
  const taxed = subtotal * (1 + taxRate);
  // subtract discount
  return taxed - discount; // return final
}
```

---

## 6. DOM and CSS Guidelines

- Don't rely on unstable class names that Shoptet may regenerate.
- When injecting HTML, ensure IDs are unique and class names are prefixed or scoped to prevent conflicts.
- Avoid creating large selector lists or global constants for arbitrary selectors.

**Do not write code like this:**

```js
const PRICE_SELECTORS = [
  '[data-testid="productCardPrice"] strong',
  '.price-standard',
  '.cart-item-price',
  '.payment-shipping-price:not(.for-free)',
  '.cart-widget-product-price strong',
  '.price-final',
  '.price-wrapper .price-primary[data-testid="recapFullPrice"]',
  '.advanced-order-price',
];
```

**Or this:**

```js
const BASE_CURRENCY = 'EUR';
const STORAGE_KEY = 'selectedCurrencyLocalStorage';
const SWITCHER_SELECTOR = '.currency-switcher';
const SURCHARGE_OPTIONS_SELECTOR = '.surcharge-parameter option';
const CONVERTED_CLASS = 'converted';
const DATA_PRICE_ATTRIBUTE = 'data-price';
const ORIGINAL_PRICE_ATTRIBUTE = 'data-original-eur-price';
const ORIGINAL_TEXT_ATTRIBUTE = 'data-original-text';
const EVENT_NAMESPACE = '.currencySwitcher';
```

→ Instead, **target stable, scoped elements** and **keep selectors context-specific**.

- For CSS overrides:
  - Use **specific but minimal selectors**.
  - Avoid `!important` unless absolutely required.
  - Comment overrides briefly to clarify the intent.

---

## 7. Shoptet dataLayer

Shoptet provides a global `shoptet.dataLayer` object containing useful page and cart information. **Use this instead of scraping the DOM** for data like prices, product info, currency, and cart contents.

📖 **Official docs:** https://developers.shoptet.com/shoptet-tools/data-layer/

### Accessing dataLayer

```js
const data = shoptet.dataLayer;
```

### Common Properties (available on all pages)

| Property       | Description                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `pageType`     | Current page type: `"homepage"`, `"category"`, `"productDetail"`, `"cart"`, etc. |
| `pageId`       | Unique page identifier                                                           |
| `currency`     | Active currency code (e.g., `"CZK"`)                                             |
| `currencyInfo` | Currency formatting details (symbol, decimal separator, exchange rate, etc.)     |
| `language`     | Current language code (e.g., `"cs"`)                                             |
| `projectId`    | Shoptet project ID                                                               |
| `cartInfo`     | Full cart state including items, shipping, discounts                             |
| `cart`         | Shorthand array of cart items                                                    |
| `customer`     | Customer info (price ratio, group, registration status)                          |

### Page-Specific Properties

**Product Detail (`pageType: "productDetail"`)**

```js
shoptet.dataLayer.product.id; // Product ID
shoptet.dataLayer.product.guid; // Product GUID
shoptet.dataLayer.product.name; // Product name
shoptet.dataLayer.product.code; // Product code/SKU
shoptet.dataLayer.product.priceWithVat; // Current price
shoptet.dataLayer.product.hasVariants; // Boolean
shoptet.dataLayer.product.currentCategory; // Category path
```

**Category (`pageType: "category"`)**

```js
shoptet.dataLayer.category.guid; // Category GUID
shoptet.dataLayer.category.path; // Category name/path
shoptet.dataLayer.category.parentCategoryGuid; // Parent GUID or null
```

### Cart Data Structure

```js
shoptet.dataLayer.cartInfo.cartItems.forEach((item) => {
  console.log(item.name); // Product name
  console.log(item.code); // SKU
  console.log(item.quantity); // Quantity in cart
  console.log(item.priceWithVat); // Price per unit
  console.log(item.guid); // Product GUID
});
```

### Currency Formatting Helper

```js
const { currencyInfo } = shoptet.dataLayer;
// currencyInfo.symbol          → "Kč"
// currencyInfo.symbolLeft      → 0 (symbol after number) or 1 (before)
// currencyInfo.decimalSeparator → ","
// currencyInfo.thousandSeparator → " "
// currencyInfo.priceDecimalPlaces → 2
```

### Usage Examples

```js
// Check page type before running page-specific code
if (shoptet.dataLayer.pageType === 'productDetail') {
  const productPrice = shoptet.dataLayer.product.priceWithVat;
  // ...
}

// Get cart total without scraping DOM
const cartTotal = shoptet.dataLayer.cartInfo.cartItems.reduce(
  (sum, item) => sum + item.priceWithVat * item.quantity,
  0
);

// Check if customer is registered
if (shoptet.dataLayer.customer.registered) {
  // Show loyalty features
}
```

### ⚠️ Important Notes

- **Always prefer dataLayer over DOM scraping** for prices, product data, and cart info.
- The dataLayer updates after AJAX operations — if you need fresh data after cart changes, re-read `shoptet.dataLayer`.
- Use `pageType` to conditionally run page-specific code instead of URL parsing.

---

## 8. When in Doubt

If you're unsure:

- Step back and **rethink the simplest approach**.
- Ask: _"Can this be done cleanly without fighting the platform?"_
- If not, document the trade-off clearly in a comment above the block.

---

> **In short:**  
> Write code that bends Shoptet to our needs — not breaks it.  
> Be methodical, practical, and smart.  
> Leave the next developer a system that makes sense.
