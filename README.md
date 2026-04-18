# CareMatch
Final project - donation and help platform.

CareMatch is a web-based platform designed to connect donors, volunteers, and organizations with individuals or institutions in need of help.  
The system creates a structured, transparent, and user-friendly environment for offering or requesting support through donations, volunteering, and professional services.

The platform was developed as a graduation project under the supervision of **Dr. Iyad Suleiman** at the **Department of Computer Science, Tel-Hai College**. 

---

## Project Overview

In many cases, people who want to help struggle to find reliable and relevant requests, while people in need often have difficulty reaching the right audience at the right time.  
CareMatch addresses this problem by centralizing the donation and aid process into a single smart platform.

After logging in, the user interacts with a **structured chatbot flow** that collects the relevant details and identifies whether the user wants to:

- Donate
- Volunteer
- Request help

Based on the collected information, the system displays filtered and relevant requests using organized result cards.  
Users requesting help can create and manage their own requests, while donors and volunteers can browse, filter, and contact request owners. 

---

## Main Objectives

- Build a smart web platform that connects donors with people and organizations in need
- Simplify the process of giving and requesting help through guided interaction
- Improve trust, transparency, and accessibility in community support systems
- Provide filtering tools for more accurate matching
- Enable request tracking and administrative control
- Support secure authentication and basic user verification

---

## Core Features

### User Features
- User registration
- Login with email and password
- OTP-based verification during login
- Secure password reset flow
- Session-based authentication
- Logout functionality

### Donation and Help Flow
- Structured chatbot interaction
- Choice between donation / volunteering / help request
- Collection of relevant information such as:
  - help type
  - donation type
  - region
  - category
  - topic
  - description

### Request Management
- Create new help requests
- Save requests in the database
- View personal requests under **My Requests**
- Browse all matching requests in a results page
- Filter requests by category and topic
- View more details using modal windows
- Contact request owners directly through the system

### Guest Features
- Guest users can donate money directly from the homepage without logging in

### Admin Features
- Dedicated admin dashboard
- Access control for authorized users only
- Content moderation and user/request management

### Media Support
- Upload request-related images through the chatbot
- Store images using **Cloudinary** 

---

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap 5

### Backend
- Node.js
- Express.js

### Database
- MySQL

### External Service
- Cloudinary for image upload and storage 

---

## System Architecture

CareMatch follows a **three-layer web architecture**:

**Client → Server → Database**

### Client Layer
The frontend provides the user interface, including:
- Homepage
- About Us page
- Donate Money page
- Login and Sign Up pages
- OTP window
- Reset Password page
- ChatBot page
- Quick Form page
- Results page
- My Requests page
- Admin page

### Server Layer
The backend is responsible for:
- Routing
- Authentication
- Session management
- Business logic
- Data processing
- Access control

### Database Layer
The MySQL database stores:
- users
- requests
- guest donations
- OTP / MFA challenges
- password reset tokens
- email verification data 

---

## Database Design

### users
Stores all registered users in the system, including:
- full name
- email
- phone
- password hash
- role (user/admin)
- region
- timestamps
- email verification status

### requests
Stores all help requests created by users, including:
- help type
- category
- target group
- topic
- region
- title
- short summary
- full description
- money request fields
- status
- volunteer pending details

### verifications_email
Used for email verification during registration.

### donations_guest
Stores guest money donations made from the homepage.

### challenges_mfa
Stores OTP verification data for secure login.

### password_reset_tokens
Stores secure tokens for password reset operations.

---

## Security and Reliability

The system includes several security and reliability mechanisms:

- Password hashing
- OTP-based login verification
- Session-based authentication
- Role-based access control for admin pages
- Controlled exposure of user information
- Foreign keys and relational integrity in the database
- Secure password reset flow
- Basic verification mechanisms to reduce abuse and misuse

---

## User Flow

A typical user flow in CareMatch is:

1. The user signs up or logs in
2. The user verifies access using OTP
3. The user enters the chatbot page
4. The system asks structured questions
5. The user selects whether to donate, volunteer, or request help
6. The system collects category, topic, region, and description
7. The system stores or processes the request
8. Relevant result cards are displayed
9. The user can filter results, view more details, and make contact 

---

## Supported Pages

According to the project book, the system includes the following main pages:

- Home Page
- About Us Page
- Donate Money Page
- Login Page
- OTP Window
- Reset Password Page
- Sign Up Page
- ChatBot Page
- Quick Form Page
- Result Page
- More Details Modal
- My Requests Page
- Admin Page 

---

## Non-Functional Requirements

The platform was designed with the following non-functional goals:

- Usability
- Clear and consistent interface
- Responsive design
- Basic security
- Privacy protection
- Data consistency
- Maintainability
- Scalability
- Reasonable performance as the system grows 

---

## Project Scope

CareMatch covers a complete end-to-end workflow:
- authentication
- data collection through guided interaction
- request storage
- filtered result presentation
- personal request management
- guest donation support
- admin-level moderation and control

---

## Challenges During Development

Some of the main development challenges included:

- Designing a secure OTP-based login flow
- Maintaining consistency between users, requests, and results
- Creating a smooth and clear user experience
- Managing access control and admin permissions
- Structuring the system into maintainable frontend, backend, and database layers

---

## Project Outcomes

The project successfully delivered:

- A full web-based system with frontend, backend, and database
- A complete authentication flow with OTP and password reset
- A guided chatbot-based interaction process
- A request management area for users
- A filtered results page with cards and modal details
- An admin dashboard for monitoring and control 

---

## Academic Information

**Project Name:** CareMatch  
**Project Type:** Graduation Project  
**Supervisor:** Dr. Iyad Suleiman  
**Department:** Computer Science  
**Institution:** Tel-Hai College 

---

## Conclusion

CareMatch is a social-impact web platform that combines accessibility, transparency, and modern web technologies to improve the process of donation, volunteering, and community support.

Beyond the technical implementation, the project highlights the importance of good user experience, security, and trust in systems that serve real people and real needs.  
The platform has strong future potential and can be expanded with additional smart matching, verification, and community-management features. 

