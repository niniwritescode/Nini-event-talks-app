import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup
from datetime import datetime

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes():
    try:
        response = requests.get(FEED_URL, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        
        # XML namespace for Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        parsed_updates = []
        
        # Iterate over entry elements
        for entry in root.findall("atom:entry", ns):
            entry_id = entry.find("atom:id", ns).text if entry.find("atom:id", ns) is not None else ""
            date_str = entry.find("atom:title", ns).text if entry.find("atom:title", ns) is not None else ""
            raw_date = entry.find("atom:updated", ns).text if entry.find("atom:updated", ns) is not None else ""
            content_elem = entry.find("atom:content", ns)
            
            if content_elem is None or not content_elem.text:
                continue
                
            content_html = content_elem.text
            soup = BeautifulSoup(content_html, "html.parser")
            
            current_type = None
            current_content = []
            
            # Iterate through the elements at the top level of the content HTML
            for element in soup.find_all(recursive=False):
                if element.name == "h3":
                    # If we have collected content for a previous header, yield it
                    if current_type is not None or current_content:
                        type_val = current_type if current_type else "General"
                        html_content = "".join(str(x) for x in current_content).strip()
                        text_content = " ".join(x.get_text().strip() for x in current_content if hasattr(x, "get_text")).strip()
                        
                        parsed_updates.append({
                            "id": f"{entry_id}#{len(parsed_updates)}",
                            "date": date_str,
                            "raw_date": raw_date,
                            "type": type_val,
                            "html": html_content,
                            "text": text_content
                        })
                    
                    current_type = element.get_text().strip()
                    current_content = []
                else:
                    current_content.append(element)
            
            # Catch the last block
            if current_type is not None or current_content:
                type_val = current_type if current_type else "General"
                html_content = "".join(str(x) for x in current_content).strip()
                text_content = " ".join(x.get_text().strip() for x in current_content if hasattr(x, "get_text")).strip()
                
                parsed_updates.append({
                    "id": f"{entry_id}#{len(parsed_updates)}",
                    "date": date_str,
                    "raw_date": raw_date,
                    "type": type_val,
                    "html": html_content,
                    "text": text_content
                })
                
        return parsed_updates
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    force_refresh = request.args.get("force", "false").lower() == "true"
    
    if force_refresh or cache["data"] is None or cache["last_fetched"] is None:
        data = parse_release_notes()
        if data is not None:
            cache["data"] = data
            cache["last_fetched"] = datetime.now().isoformat()
        elif cache["data"] is None:
            return jsonify({
                "status": "error",
                "message": "Failed to fetch release notes from Google Cloud feed."
            }), 500
            
    return jsonify({
        "status": "success",
        "last_fetched": cache["last_fetched"],
        "data": cache["data"]
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
