# Flask E-commerce API

Aplikacja backendowa Flask z systemem uwierzytelniania, płatnościami Stripe i panelem administracyjnym.

## 🚀 Funkcjonalności

### Uwierzytelnianie
- **Rejestracja/logowanie lokalne** - klasyczne konto użytkownika
- **OAuth Google** - logowanie przez konto Google
- **OAuth GitHub** - logowanie przez konto GitHub
- **JWT tokens** - bezpieczne zarządzanie sesjami
- **Panel administratora** - zarządzanie transakcjami

### Płatności
- **Stripe Checkout** - bezpieczne płatności online
- **Płatności offline** - możliwość tworzenia płatności manualnych
- **Webhooks** - automatyczne przetwarzanie płatności
- **Historia transakcji** - pełny podgląd płatności

### API
- **RESTful endpoints** - zgodne ze standardami REST
- **CORS support** - obsługa aplikacji frontendowych
- **JSON responses** - strukturalne odpowiedzi API

## 🛠️ Technologie

- **Flask** - framework webowy
- **SQLAlchemy** - ORM dla bazy danych
- **Flask-Login** - zarządzanie sesjami użytkowników
- **Authlib** - OAuth authentication
- **Stripe** - processing płatności
- **JWT** - tokeny autoryzacyjne
- **SQLite** - baza danych

## 📦 Instalacja

### Wymagania
- Python 3.8+
- pip
