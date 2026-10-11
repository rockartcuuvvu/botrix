# Corporate B2B Quote-Based E-Commerce Platform

A production-grade, full-stack B2B e-commerce and corporate procurement platform specializing in **Stationery**, **Online Development Packages**, **Computers & Workstations**, and **Custom Enterprise Solutions**.

---

## 🌟 Key Architecture & Features

### 🔒 1. Strict Price Gating Rule
- **No public prices**: Unauthenticated visitors and new registered users cannot view product prices on the storefront.
- **Price Display**: Displays *"Request Quote to View Price"* with price inputs stripped at the API layer.

### 📄 2. Quote Request -> Custom Catalogue Pipeline
1. **Client Account Registration**: B2B client registers with corporate contact and company details.
2. **Quote Submission**: Client submits a Quote Request for catalog items or custom requirements.
3. **Admin Quoting & Catalogue Loading**:
   - Admin reviews the quote request in the Admin Console.
   - Admin assigns custom per-item contract pricing (`itemPrices`).
   - Upon approving/quoting, the prices are **automatically loaded into the client's personalized `ClientCatalogue`**.
4. **Catalogue Shopping & Order Checkout**:
   - The client can now view their custom contract prices loaded into their account.
   - The client places purchase orders using their negotiated catalogue pricing.
   - System strictly validates that ordered items exist in the client's approved catalogue.

### 💬 3. In-App Direct Client Portal Chat
- Clients chat directly with sales representatives and admins through an integrated **In-App Live Chat Portal**.
- Supports real-time messaging powered by Socket.io, with unread indicators and admin thread management.

### 🛡️ 4. Dual Portal Interfaces
- **Client Portal**: Quote Requests tracker, Custom Quoted Catalogue, Purchase Orders & History, Direct Chat Desk.
- **Admin Console**: Quote Request Management & Catalogue Pricing Tool, Order Processing & Status Tracker, Client Chat Threads.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Mongoose (MongoDB)
- **Real-Time Communication**: Socket.io
- **Security & Authentication**: bcryptjs password hashing, JWT cookies, Express Session
- **Views & UI**: EJS template engine with Tailwind CSS
- **Testing**: Jest, Supertest, MongoMemoryServer

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB instance (or local MongoDB server)

### Installation
```bash
npm install
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/b2b_store
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
```

### Run Application
```bash
# Start production server
npm start

# Start development mode
npm run dev
```

### Run Test Suite
```bash
npm test
```
