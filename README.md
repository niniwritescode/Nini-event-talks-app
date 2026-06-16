# BigQuery Release Notes Tracker & Tweet Composer

A highly responsive, glassmorphic web application built with **Python Flask** and vanilla **HTML, CSS, and JavaScript**. The application fetches Google Cloud's official BigQuery release notes Atom feed, structures individual updates, and provides a composer to compile and post updates to X (Twitter).

---

## ✨ Features

- **Automated Syncing:** Fetches live release notes directly from the Google Cloud feed.
- **Micro-parsing:** Automatically breaks down daily release entries into separate feature/issue/deprecation cards.
- **Modern Glassmorphic UI:** A dark-themed layout built with vanilla CSS, featuring glowing categorisation badges and smooth transitions.
- **Tweet Workspace (Composer):** Select multiple updates to auto-generate a tweet draft with warning alerts for the X/Twitter 280-character limit.
- **Client-Side Filtering & Search:** Filter updates dynamically by type (Features, Issues, Deprecations, General) or search keywords in real-time.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.13+, Flask, Requests, BeautifulSoup4
- **Frontend:** Vanilla HTML5, CSS3 (Custom Properties & Grid/Flexbox), Vanilla ES6 JavaScript
- **Icons & Typography:** Google Fonts (Outfit & Inter), Google Material Symbols

---

## 🚀 Quick Start

### 1. Prerequisite Packages
Ensure you have the required packages installed:
```bash
pip install flask requests beautifulsoup4
```

### 2. Run the Development Server
Execute the Flask entry file:
```bash
python app.py
```

### 3. Open in Browser
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📂 Project Structure

```
├── app.py                   # Flask server, XML retrieval, and BeautifulSoup parsing logic
├── templates/
│   └── index.html           # Main semantic HTML structure
├── static/
│   ├── css/
│   │   └── style.css        # Premium dark glassmorphic styling sheet
│   └── js/
│       └── main.js          # Client-side filtering, state manager, and composer actions
└── .gitignore               # Ignored build, cache, and editor files
```

---

## ⚙️ How It Works (Request Flow)

1. The browser requests `/api/release-notes` from the Flask server.
2. Flask fetches the Google Cloud feed, parsing the XML entries.
3. The server uses `BeautifulSoup` to divide single daily logs into distinct `<h3>` update chunks.
4. Client renders card listings with checkboxes. Checking updates automatically formats bullet points in the sidebar Tweet Composer.
