# EazyShop Ecommerce Platform

A robust, full-stack ecommerce solution built with Django REST Framework and React. EazyShop features a secure inventory management system, responsive UI, and a seamless checkout experience.

## 🌐 Live Demo
You can view the live application here:
**[[Live Demo](https://django-react-ecommerce-platform.vercel.app/)]**

## 🚀 Key Features

- **User Authentication:** Secure JWT-based authentication.
- **Inventory Management:** Atomic database transactions with pessimistic row-locking to prevent overselling.
- **Order Lifecycle:** Users can track orders via a custom Dashboard and cancel `pending` orders with automated inventory restoration.
- **Checkout Integrity:** Mandatory shipping address and phone number validation.
- **Wishlist:** Saved product functionality for registered users.
- **Responsive UI:** Mobile-first design optimized with Styled Components and Framer Motion animations.
- **Smart UX:** "Go to Cart" quick-actions and custom confirmation modals to replace native browser alerts.

## 🛠 Tech Stack

### Backend
- **Framework:** Django REST Framework
- **Database:** PostgreSQL
- **Logic:** Django Transactions (for ACID compliance)

### Frontend
- **Framework:** React
- **Animations:** Framer Motion
- **Styling:** Styled Components (CSS-in-JS)
- **Networking:** Axios
- **Notifications:** React Hot Toast

### Current Version: v1.2.4

### Recent Updates:
- Implemented robust order cancellation logic with inventory restoration.
- Fixed checkout data-integrity bugs (Address/Phone validation).
- Added "Go to Cart" quick-actions to the product grid.
- Polished UI/UX with custom confirmation modals and iron-clad styling.
