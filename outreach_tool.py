import csv
import smtplib
import getpass
from email.mime.text import MIMEText

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
    return leads

def read_email_template(filename="email_template.txt"):
    """
    Reads the email template from a file.
    Returns the subject and body as a tuple.
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            subject = lines[0].replace("Subject: ", "").strip()
            body = "".join(lines[1:]).strip()
            return subject, body
    except FileNotFoundError:
        print(f"Error: The file {filename} was not found.")
        return None, None

def send_email(smtp_server, smtp_port, smtp_user, smtp_password, to_email, subject, body):
    """
    Sends an email using the provided SMTP credentials.
    """
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email

    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        print("  > Email sent successfully!")
        return True
    except Exception as e:
        print(f"  > Error sending email: {e}")
        return False

if __name__ == "__main__":
    leads = read_leads()
    subject_template, body_template = read_email_template()

    if not leads or not subject_template:
        print("Could not load leads or email template. Exiting.")
    else:
        print("--- AI Outreach Tool ---")
        print("Please provide your SMTP details to send emails.")
        smtp_server = input("SMTP Server: ")
        smtp_port = int(input("SMTP Port (e.g., 465 for SSL): "))
        smtp_user = input("SMTP Username (your email): ")
        smtp_password = getpass.getpass("SMTP Password: ")

        for i, lead in enumerate(leads):
            company_name = lead.get('Name')
            if not company_name:
                continue

            print(f"\n--- Lead {i+1}/{len(leads)} ---")
            print(f"Company: {company_name}")
            print(f"Website: {lead.get('Website')}")

            recipient_email = input("Enter the email address for this lead (or press Enter to skip): ")
            if not recipient_email:
                continue

            body = body_template.replace('{company_name}', company_name)

            print("\n--- Email Preview ---")
            print(f"To: {recipient_email}")
            print(f"Subject: {subject_template}")
            print(f"Body:\n{body}")
            print("--------------------")

            confirm = input("Send this email? (y/n) or q to quit: ").lower()
            if confirm == 'q':
                break
            if confirm == 'y':
                send_email(smtp_server, smtp_port, smtp_user, smtp_password, recipient_email, subject_template, body)
            else:
                print("  > Skipping email.")

        print("\n--- Outreach session finished ---")
