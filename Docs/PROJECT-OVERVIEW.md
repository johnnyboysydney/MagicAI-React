# 🚀 Project Overview

This document provides a high-level overview of the deck analyzer application, outlining its purpose, key features, technical setup, and future plans.

---

## **Project Purpose**

The deck analyzer app is designed to help Magic: The Gathering players analyze and optimize their decks. The tool provides basic analysis, deck recommendations, and card data from the **Scryfall API**. The goal is to offer a free and user-friendly service with the option to upgrade to a pro version for more advanced features, including AI-powered suggestions and cloud storage.

---

## **Core Features (MVP)**

- **Responsive UI**: Works seamlessly on both mobile and desktop devices.
- **Deck Entry**: Users can manually input decklists or paste decklist data.
- **Basic Deck Export/Import**: Support for CSV and JSON formats.
- **Deck Analysis**: Includes mana curve analysis, card type balance, archetype matching, and basic rule-based recommendations.
- **Local Deck Storage**: Stores decks locally using IndexedDB or LocalStorage with offline access.
- **Card Data Fetching**: Uses the **Scryfall API** to fetch card images and names for easy deck creation.

---

## **Technical Overview**

- **Frontend Stack**: React, Angular, or Vue.js.
- **Backend (Optional)**: Node.js (Express) or FastAPI for future cloud features.
- **Storage**: LocalStorage or IndexedDB for local deck storage.
- **API**: The app integrates with the **Scryfall API** for card data.

---

## **Future Expansion (Paid Version)**

- **AI-Powered Suggestions**: Advanced deck suggestions using machine learning.
- **Cloud Storage**: Store decks in the cloud for synchronization across devices.
- **Meta Deck Comparison & Win Prediction**: Compare decks against meta trends and predict win rates.
