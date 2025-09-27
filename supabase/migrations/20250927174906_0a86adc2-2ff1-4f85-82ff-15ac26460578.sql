-- Insert initial client policy records if they don't exist
INSERT INTO form_policies (type, title, content, status, version, created_at, updated_at)
SELECT 
  'client_policies',
  'Terms of Service',
  'Welcome to **EgyptLegalPro**. These Terms of Service ("Terms") govern your use of our platform, services, and website. By registering for an account or using EgyptLegalPro, you agree to these Terms in full. If you do not agree, you must not use our platform.

## 1. Company Information
EgyptLegalPro is operated by **LegalPro**, registered in **Cairo, Egypt**.
For inquiries, contact us at: **support@egyptlegalpro.com**

## 2. Platform Role & Disclaimer
- EgyptLegalPro is **not a law firm** and does not provide legal advice or representation.
- EgyptLegalPro acts solely as a **facilitator**, connecting clients with independent licensed lawyers.
- All lawyers on the platform are independent professionals solely responsible for their conduct and services.
- Case outcomes are never guaranteed by EgyptLegalPro.

*[Additional terms content will be added through the admin interface]*',
  'published',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM form_policies 
  WHERE type = 'client_policies' AND title = 'Terms of Service'
);

INSERT INTO form_policies (type, title, content, status, version, created_at, updated_at)
SELECT 
  'client_policies',
  'Privacy Policy',
  'At **EgyptLegalPro**, we value your privacy. This Privacy Policy explains how we collect, use, store, and share your personal data when you use our platform. By using EgyptLegalPro, you agree to the practices described below.

## 1. Company Information
EgyptLegalPro is operated by **LegalPro**, registered in **Cairo, Egypt**.
For privacy-related inquiries, contact us at: **support@egyptlegalpro.com**

## 2. Information We Collect
We may collect the following types of information:
1. **Account Information** – name, email, phone number, address, ID documents.
2. **Case Information** – information you provide when submitting a legal inquiry or case.
3. **Payment Information** – processed through secure third-party providers.
4. **Communication Data** – all messages, audio calls, and video calls conducted via our platform.
5. **Technical Data** – IP address, browser type, device information, cookies, and usage patterns.

*[Additional privacy policy content will be added through the admin interface]*',
  'published',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM form_policies 
  WHERE type = 'client_policies' AND title = 'Privacy Policy'
);