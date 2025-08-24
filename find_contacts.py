import csv
import requests
from bs4 import BeautifulSoup
import re
import time
from urllib.parse import urljoin

def read_leads(filename="leads.csv"):
    """
    Reads leads from a CSV file and returns a list of dictionaries.
    """
    leads = []
    try:
        with open(filename, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                leads.append(row)
    except FileNotFoundError:
        print(f"Error: The file {filename} was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")
    return leads

def find_contact_page(base_url):
    """
    Tries to find a contact page URL on a given website.
    """
    try:
        response = requests.get(base_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException:
        return None

    soup = BeautifulSoup(response.content, 'html.parser')
    contact_keywords = ['contact', 'about', 'contact-us']

    for keyword in contact_keywords:
        # Look for links containing the keyword
        contact_link = soup.find('a', href=re.compile(keyword, re.IGNORECASE))
        if contact_link:
            return urljoin(base_url, contact_link['href'])

        # Look for links with text containing the keyword
        contact_link = soup.find('a', text=re.compile(keyword, re.IGNORECASE))
        if contact_link:
            return urljoin(base_url, contact_link['href'])

    return None # Return homepage if no contact page is found

def extract_emails_from_url(url):
    """
    Extracts all email addresses from a given URL.
    """
    if not url:
        return []

    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException:
        return []

    emails = set(re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", response.text))
    return list(emails)

if __name__ == "__main__":
    print("Reading leads from leads.csv...")
    leads = read_leads()

    if leads:
        print(f"Found {len(leads)} leads.")
        print("Processing the first 5 leads as a sample to find contacts...")

        with open('contacts.csv', 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['company_name', 'website', 'emails']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for lead in leads[:5]:
                company_name = lead.get('Name')
                website_url = lead.get('Website')

                if not (company_name and website_url):
                    continue

                print(f"\nProcessing: {company_name} ({website_url})")

                contact_page_url = find_contact_page(website_url)
                if contact_page_url:
                    print(f"  > Found contact page: {contact_page_url}")
                    emails = extract_emails_from_url(contact_page_url)
                else:
                    print("  > No contact page found, searching homepage.")
                    emails = extract_emails_from_url(website_url)

                if emails:
                    print(f"  > Found emails: {', '.join(emails)}")
                    writer.writerow({
                        'company_name': company_name,
                        'website': website_url,
                        'emails': ', '.join(emails)
                    })
                else:
                    print("  > No emails found.")

                time.sleep(1)

        print("\nFinished processing sample. Results saved to contacts.csv")
    else:
        print("No leads to process.")
