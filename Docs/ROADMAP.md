# 🚀 Development Roadmap for Free Version (MVP)

This document outlines the **roadmap** and key features for the **free version (MVP)** of the deck analyzer application, which serves as the foundation for future expansion into paid features.

---

## 📌 **Phase 1: Free Version (MVP)**
**Objective:**  
Build a working **deck analyzer** with **basic (non-AI) recommendations**, local storage, and a clean user experience.

---

### **1️⃣ Core Features (Must-Have)**

🔹 **User Interface & UX**  
✔ Simple and **responsive UI** (mobile + desktop)  
✔ Easy deck entry **(manual or paste decklist format)**  
✔ **Basic deck export/import** (CSV, JSON)  

🔹 **Deck Storage (Local Only)**  
✔ **IndexedDB or LocalStorage** (stores decks in-browser)  
✔ **Limited saves (1-2 decks per month for free users)**  
✔ **Offline support (PWA optional)**  

🔹 **Basic Deck Analysis (Rule-Based)**  
✔ **Mana Curve Analysis**  
   - Shows **land count** and mana distribution  
   - Suggests if the deck has **too many high-cost cards**  
✔ **Card Type Balance**  
   - Checks if the deck has **too many creatures vs. spells**  
✔ **Basic Archetype Matching**  
   - Identifies if the deck is **Aggro, Control, Midrange, or Combo**  
✔ **Basic Recommendations (Non-AI)**  
   - “Your deck has **too few removal spells**, consider adding [examples]”  
   - “You have **too many high-mana creatures**, balance the curve”  

🔹 **Web Scraping / Card Database**  
✔ **Fetch card images & names** using the **Scryfall API**  
✔ Search & auto-fill cards when **adding to a deck**  

🔹 **Basic User Access**  
✔ **No login required** (local storage)  
✔ Basic prompt: "Upgrade to Pro for more features" (upsell later)  

---

## **2️⃣ Technical Setup (Recommended Stack)**

| Feature            | Recommended Tech  |
|--------------------|------------------|
| UI/Frontend       | **React, Angular, or Vue.js** |
| Local Storage     | **IndexedDB, SQLite, or LocalStorage** |
| Card Data        | **Scryfall API** (preferred) |
| Backend (Optional) | **Node.js (Express) or FastAPI** (for future cloud storage) |
| Deployment       | **Netlify, Vercel, Firebase (for static hosting)** |

🔹 **Why Local Storage First?**  
- Avoids backend costs in **early stages**  
- Keeps **performance fast**  
- Allows easy **offline deck access**  

---

## **3️⃣ Future Expansion (Planned for Paid Version)**
🔥 **AI-powered suggestions** → Paid version  
🔥 **Cloud storage for decks** → Paid version  
🔥 **Meta deck comparison & win prediction** → Paid version  

---

## **⏳ Timeline & Milestones**

### **Week 1-2: UI & Deck Entry**
✅ Design **basic UI (React/Angular)**  
✅ Implement **deck entry & manual editing**  
✅ Integrate **Scryfall API for card search**  

### **Week 3-4: Basic Analysis & Recommendations**
✅ Implement **mana curve visualization**  
✅ Add **rule-based recommendations**  
✅ **Test performance & UX**  

### **Week 5-6: Storage & Release**
✅ Store decks **locally in IndexedDB**  
✅ Set up **basic versioning & deployment**  
✅ Prepare **for public beta release**  

---

## **🔥 Next Steps**
Would you like help with:
1️⃣ **UI/UX wireframing** (mockups & design ideas)?  
2️⃣ **Database setup** (IndexedDB structure)?  
3️⃣ **Frontend framework choice (React/Angular/Vue)?**
