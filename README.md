# Farm Inventory

A mobile-first farm stock demo built with Expo SDK 58, React Native, TypeScript, and Expo Router. It includes a farm dashboard, searchable inventory list, configurable farm settings, and categorized stock management.

## Run locally

```bash
npm install
npx expo start
```

Open the project in Expo Go. The inventory and settings are saved locally with AsyncStorage and are seeded with demo farm data on first launch. Scanner results, weather conditions, and integrations are demonstration data; the app does not connect to external services.

## Main features

- Dashboard summaries, dynamic low-stock and expiry alerts, recent stock activity, and quick stock actions.
- Item search, category filters, sorting, and add/edit forms.
- Five expandable stock sections for farm inputs, harvests, livestock, finished goods, and equipment.
- Persistent measurement, reorder, valuation, location, integration, and role settings.

## Project layout

- `src/app/` — Expo Router tabs
- `src/components/` — shared farm UI and reusable forms
- `src/context/` — persistent inventory and settings state
- `src/data/` — initial demo data
- `src/types/` — inventory domain types
- `src/utils/` — stock and alert helpers
