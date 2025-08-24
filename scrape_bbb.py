import requests
from lxml import etree
from bs4 import BeautifulSoup
import csv
import time

def get_sitemap_urls(sitemap_index_url):
    """
    Fetches a sitemap index and returns a list of sitemap URLs.
    """
    try:
        response = requests.get(sitemap_index_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching sitemap index: {e}")
        return []

    try:
        root = etree.fromstring(response.content)
        namespace = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        loc_elements = root.xpath('//sm:loc', namespaces=namespace)
        return [elem.text for elem in loc_elements]
    except etree.XMLSyntaxError as e:
        print(f"Error parsing sitemap XML: {e}")
        return []

def get_profile_urls_from_sitemap(sitemap_url):
    """
    Fetches a sitemap and returns a list of profile URLs.
    """
    try:
        response = requests.get(sitemap_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching sitemap: {e}")
        return []

    try:
        root = etree.fromstring(response.content)
        namespace = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        loc_elements = root.xpath('//sm:loc', namespaces=namespace)
        return [elem.text for elem in loc_elements]
    except etree.XMLSyntaxError as e:
        print(f"Error parsing sitemap XML: {e}")
        return []

def scrape_profile_page(profile_url):
    """
    Scrapes a BBB profile page to get the business name and website.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    }
    try:
        response = requests.get(profile_url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching profile page {profile_url}: {e}")
        return None

    soup = BeautifulSoup(response.content, 'html.parser')

    # Let's refine the selectors based on re-evaluating the HTML.
    # The name is in a <p> tag with class 'bds-h1'
    name_tag = soup.select_one('p.bds-h1')
    name = name_tag.text.strip() if name_tag else None

    # The website is in an <a> tag with class 'dtm-visit-website'
    website_tag = soup.select_one('a.dtm-visit-website')
    website = website_tag['href'] if website_tag else None

    if name and website:
        return {'name': name, 'website': website}
    return None

if __name__ == "__main__":
    SITEMAP_INDEX_URL = "https://www.bbb.org/sitemap-business-profiles-index.xml"
    print(f"Starting lead generation from BBB sitemaps...")

    sitemap_urls = get_sitemap_urls(SITEMAP_INDEX_URL)

    if not sitemap_urls:
        print("Could not fetch sitemap index. Exiting.")
    else:
        print(f"Found {len(sitemap_urls)} sitemaps.")

        # For demonstration, we'll just process the first sitemap
        first_sitemap_url = sitemap_urls[0]
        print(f"Processing sitemap: {first_sitemap_url}")

        profile_urls = get_profile_urls_from_sitemap(first_sitemap_url)

        if not profile_urls:
            print("No profile URLs found in the sitemap.")
        else:
            print(f"Found {len(profile_urls)} profile URLs. Scraping the first 10 as a sample.")

            with open('leads.csv', 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['name', 'website']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()

                scraped_count = 0
                for url in profile_urls[:20]: # Try 20 to ensure we get a few
                    if scraped_count >= 10:
                        break

                    print(f"Scraping {url}...")
                    lead = scrape_profile_page(url)

                    if lead:
                        writer.writerow(lead)
                        print(f"  > Found: {lead['name']}, {lead['website']}")
                        scraped_count += 1
                    else:
                        print("  > Could not extract name and website.")

                    time.sleep(1) # Be respectful and don't spam requests

            print(f"\nFinished scraping. {scraped_count} leads saved to leads.csv")
