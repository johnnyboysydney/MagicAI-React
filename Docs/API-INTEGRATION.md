# API & Integration Docs

## 📘 API & Integration Documentation

This section documents how the app interacts with **external APIs** (e.g., Scryfall, payment gateways) and any **internal APIs** your app may expose for front-end or third-party use.

---

### ✅ Structure of Your API & Integration Docs

- External API Integrations (e.g., Scryfall, Stripe)
- Internal API Design (planned or current)
- Security & Best Practices
- Integration Checklist
- Optional Extensions (testing, versioning)

---

### 1. **External API Integrations**

---

#### 🧩 Scryfall API

- **Purpose**: Used to fetch Magic: The Gathering card data including names, prices, images, and types.
- **Base URL**: `https://api.scryfall.com`

**Key Endpoints**:
- `/cards/named?exact={cardName}` – Fetch single card by exact name
- `/cards/search?q={query}` – Search cards with filters
- `/sets` – Get all MTG sets

**Authentication**:
- No authentication required.
- Still implement retry logic and backoff mechanisms.

**Rate Limits**:
- Limit: **10 requests per second**
- Use caching for commonly searched data
- Respect `Retry-After` headers on HTTP 429

**Usage Example**:
```http
GET https://api.scryfall.com/cards/named?exact=Lightning%20Bolt
```
---

---

### 💳 Stripe/PayPal API

- **Purpose**: Manage subscription billing for pro users

**Authentication**:

Use API keys stored securely in environment variables (`.env`)

**Endpoints Used** (example for Stripe):

- Create checkout session
- Retrieve subscription status
- Handle webhooks (`/webhook/stripe`)

---

## 2. **Internal APIs (Future)**

If your app includes a backend (e.g., FastAPI or Node.js) that serves its own data:

### 🔌 Base URL

---

### 🔐 Authentication

- Use **JWT tokens** or **OAuth 2.0**
- Public endpoints available to all users
- Private endpoints require authentication

### 🧾 Example Routes

| Method | Endpoint              | Description             |
|--------|-----------------------|-------------------------|
| GET    | `/api/v1/decks`       | List all decks          |
| POST   | `/api/v1/decks`       | Create new deck         |
| GET    | `/api/v1/decks/:id`   | Fetch single deck       |
| PUT    | `/api/v1/decks/:id`   | Update existing deck    |
| DELETE | `/api/v1/decks/:id`   | Remove deck by ID       |

---

## 3. Security & Best Practices

- 🔒 Never hardcode secrets — use `.env` files and environment variables  
- 🌐 Use **HTTPS** for all external/internal API calls  
- 🧼 Sanitize all user inputs before processing or forwarding to third-party APIs  
- 🚧 Rate-limit and throttle requests to prevent API abuse  
- 🔁 Implement retry logic using **exponential backoff** for 5xx or 429 errors  

---

## 4. Integration Checklist

- ✅ API credentials stored securely  
- ✅ Usage examples included  
- ✅ Webhooks verified  
- ✅ Logs implemented (optional) for debugging  
- ✅ Error handling in place (timeouts, rate limits, fallback)  

---

## Optional Additions

- 📦 Postman or Thunder Client API Collections for testing  
- 📄 Swagger / OpenAPI spec (if building internal REST API)  
- 📍 API versioning strategy (`/api/v1`, `/api/v2`, etc.)  
- ⏱️ Monitoring (uptime checks on endpoints)  

---

