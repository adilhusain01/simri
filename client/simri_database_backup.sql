--
-- PostgreSQL database dump
--

\restrict vwvAzqCMdVvkmEuJxulZZCGQ4pcdaEelYY6QqcoH4LOTsHgWnnboAa17omeqck0

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: simri_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO simri_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.addresses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type character varying(20) DEFAULT 'shipping'::character varying,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    company character varying(255),
    address_line_1 character varying(255) NOT NULL,
    address_line_2 character varying(255),
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    postal_code character varying(20) NOT NULL,
    country character varying(100) NOT NULL,
    phone character varying(20),
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.addresses OWNER TO simri_user;

--
-- Name: cart_abandonment_tracking; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.cart_abandonment_tracking (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    last_activity timestamp with time zone DEFAULT now(),
    is_abandoned boolean DEFAULT false,
    abandoned_at timestamp with time zone,
    is_recovered boolean DEFAULT false,
    recovered_at timestamp with time zone,
    reminder_count integer DEFAULT 0,
    last_reminder_sent timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cart_abandonment_tracking OWNER TO simri_user;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cart_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    price_at_time numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO simri_user;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.carts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    session_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.carts OWNER TO simri_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    image_url character varying(512),
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO simri_user;

--
-- Name: coupon_usage; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.coupon_usage (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    coupon_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    used_at timestamp with time zone DEFAULT now(),
    discount_amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.coupon_usage OWNER TO simri_user;

--
-- Name: coupons; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.coupons (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(20) NOT NULL,
    value numeric(10,2) NOT NULL,
    minimum_order_amount numeric(10,2),
    maximum_discount_amount numeric(10,2),
    usage_limit integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    created_for_user uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.coupons OWNER TO simri_user;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.email_verification_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_verification_tokens OWNER TO simri_user;

--
-- Name: inventory_history; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.inventory_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid,
    change_type character varying(20) NOT NULL,
    quantity_change integer NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    notes text,
    user_id uuid,
    order_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.inventory_history OWNER TO simri_user;

--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    is_active boolean DEFAULT true,
    preferences json,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.newsletter_subscribers OWNER TO simri_user;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid,
    product_id uuid,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    product_snapshot json,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO simri_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    order_number character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_status character varying(20) DEFAULT 'pending'::character varying,
    shipping_status character varying(20) DEFAULT 'not_shipped'::character varying,
    total_amount numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0,
    shipping_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    coupon_id uuid,
    coupon_code character varying(50),
    coupon_discount_amount numeric(10,2) DEFAULT 0,
    recommended_product boolean DEFAULT false,
    currency character varying(3) DEFAULT 'INR'::character varying,
    shipping_address json NOT NULL,
    billing_address json,
    payment_method character varying(50),
    payment_id character varying(255),
    razorpay_order_id character varying(255),
    razorpay_payment_id character varying(255),
    tracking_number character varying(255),
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    notes text,
    shiprocket_order_id character varying(255),
    shiprocket_shipment_id character varying(255),
    awb_number character varying(255),
    courier_name character varying(255),
    cancellation_reason text,
    cancelled_at timestamp with time zone,
    refund_amount numeric(10,2),
    refund_status character varying(20) DEFAULT 'none'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.orders OWNER TO simri_user;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO simri_user;

--
-- Name: product_purchase_patterns; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.product_purchase_patterns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    co_purchased_with uuid NOT NULL,
    frequency integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_purchase_patterns OWNER TO simri_user;

--
-- Name: product_reviews_summary; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.product_reviews_summary (
    product_id uuid NOT NULL,
    average_rating numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    rating_distribution json DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::json,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.product_reviews_summary OWNER TO simri_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    short_description character varying(500),
    sku character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    stock_quantity integer DEFAULT 0,
    category_id uuid,
    images json,
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    weight numeric(8,2),
    dimensions json,
    tags text[],
    meta_title character varying(255),
    meta_description character varying(500),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.products OWNER TO simri_user;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    product_id uuid,
    order_id uuid,
    rating integer NOT NULL,
    title character varying(255),
    comment text,
    images json,
    is_verified_purchase boolean DEFAULT false,
    is_approved boolean DEFAULT true,
    helpful_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO simri_user;

--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid,
    quantity integer NOT NULL,
    reserved_until timestamp with time zone NOT NULL,
    session_id character varying(255),
    user_id uuid,
    order_id uuid,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_reservations_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.stock_reservations OWNER TO simri_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    google_id character varying(255),
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255),
    phone character varying(20),
    avatar_url character varying(512),
    role character varying(20) DEFAULT 'customer'::character varying,
    auth_provider character varying(20) DEFAULT 'local'::character varying,
    is_verified boolean DEFAULT false,
    email_verified_at timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_auth_provider CHECK (((auth_provider)::text = ANY ((ARRAY['local'::character varying, 'google'::character varying])::text[]))),
    CONSTRAINT check_password_for_local CHECK (((((auth_provider)::text = 'local'::text) AND (password_hash IS NOT NULL)) OR (((auth_provider)::text = 'google'::text) AND (google_id IS NOT NULL))))
);


ALTER TABLE public.users OWNER TO simri_user;

--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: simri_user
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    product_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.wishlists OWNER TO simri_user;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.addresses (id, user_id, type, first_name, last_name, company, address_line_1, address_line_2, city, state, postal_code, country, phone, is_default, created_at, updated_at) FROM stdin;
d0285710-9563-4f83-850d-330ae73f5ce8	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	shipping	Adil	Husain		Salaria Home PG, Bhutani Colony		Phagwara	Punjab	144411	India	8604135956	t	2025-09-15 20:13:13.599005+00	2025-09-15 20:13:13.599005+00
a80d91f5-7219-4f3c-9082-d3f8c18b1173	dceb408d-2a45-4d4f-8784-22435ae0fe9e	shipping	Adil	Husain		Salaria PG, Bhutani Colony		Phagwara	Punjab	144411	India	8604135956	t	2025-09-17 05:19:18.659898+00	2025-09-17 05:19:18.659898+00
\.


--
-- Data for Name: cart_abandonment_tracking; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.cart_abandonment_tracking (id, user_id, last_activity, is_abandoned, abandoned_at, is_recovered, recovered_at, reminder_count, last_reminder_sent, created_at, updated_at) FROM stdin;
b6e2a490-40a7-4de4-ba0c-c7b73099d4dc	dceb408d-2a45-4d4f-8784-22435ae0fe9e	2025-09-20 07:12:13.693275+00	f	2025-09-19 18:30:00.041549+00	t	2025-09-19 14:23:02.120762+00	0	\N	2025-09-17 05:13:25.367319+00	2025-09-20 07:12:13.693275+00
321eb985-657c-4a1f-aa7a-9a306a0918e6	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	2025-11-11 16:07:23.78022+00	f	2025-11-11 14:30:00.027051+00	t	2025-11-11 16:03:38.666123+00	0	\N	2025-09-15 20:12:38.599992+00	2025-11-11 16:07:23.78022+00
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.cart_items (id, cart_id, product_id, quantity, price_at_time, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.carts (id, user_id, session_id, created_at, updated_at) FROM stdin;
c8d21bba-28fa-4d9c-8f45-64d1393f4f81	\N	8OqIFWbIzmV7X1qgDXWKkGHkAS8Sv9HT	2025-09-15 20:12:27.269347+00	2025-09-15 20:12:27.269347+00
717cb193-2429-4a71-83dc-d487acebbbcd	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	\N	2025-09-15 20:12:33.330715+00	2025-09-15 20:12:33.330715+00
e076c9d3-71d2-406f-91b6-6cb8b3861efb	dceb408d-2a45-4d4f-8784-22435ae0fe9e	\N	2025-09-16 09:44:57.167203+00	2025-09-16 09:44:57.167203+00
67c13558-3c52-49ae-9f2d-e276bef85581	\N	MPTgMu6dOM8WnG4zxmve_So3DK0iN3XM	2025-09-17 14:59:25.488948+00	2025-09-17 14:59:25.488948+00
240fe686-e611-42d0-8e96-b49cd3982316	\N	3D8kSnSK5GIjH-Y6Jq8qo2EKWblLFfYq	2025-09-19 14:03:31.849874+00	2025-09-19 14:03:31.849874+00
ceea6583-4ef4-414b-9fed-af4b3c10007b	\N	AYUZqiYpGneR3f3sFH63ZNjaL4IIAHNK	2025-09-19 14:03:31.858828+00	2025-09-19 14:03:31.858828+00
05716783-e390-4d2d-988b-0cadd6c86f01	\N	6-5kGL5mLJDtgqTxWJRJmSNKsHfqn8CV	2025-09-21 09:07:44.316579+00	2025-09-21 09:07:44.316579+00
cde010a2-c121-4369-943a-65cd073a0533	\N	qpwwM7g1rq_ScDDJCtsqByHOIybxPiRO	2025-09-21 10:32:46.433286+00	2025-09-21 10:32:46.433286+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.categories (id, name, slug, description, image_url, parent_id, is_active, created_at, updated_at) FROM stdin;
73de7f38-0310-49fd-987f-433879e10c66	For Parents	for-parents	\N	https://res.cloudinary.com/djxuqljgr/image/upload/v1762900051/simri/categories/ej2jkmvp6hnt1susumek.webp	\N	t	2025-11-11 22:27:32.918079+00	2025-11-11 22:27:32.918079+00
cc45dd8c-b79d-49e6-b414-cbcb6d13abd1	For Birthday	for-birthday	Make every birthday memorable with our special collection	https://res.cloudinary.com/djxuqljgr/image/upload/v1762900156/simri/categories/uftrezsvtjfktzeh1bd7.webp	\N	t	2025-09-15 20:12:24.822193+00	2025-11-11 22:29:17.67204+00
93a07171-24f6-4f96-870f-4b59efa87d97	For Him	for-him	Perfect gifts for men of all ages and interests	https://res.cloudinary.com/djxuqljgr/image/upload/v1762899912/simri/categories/tzu2hutzqdarhpvmx8zj.webp	\N	t	2025-09-15 20:12:24.822193+00	2025-11-11 22:29:46.602703+00
b5f687f1-089a-4544-8e28-364af450bd5e	For Her	for-her	Beautiful and thoughtful gifts for the special women in your life	https://res.cloudinary.com/djxuqljgr/image/upload/v1762899952/simri/categories/mq3avayptcv9yb1id8f7.webp	\N	t	2025-09-15 20:12:24.822193+00	2025-11-11 22:29:53.292705+00
8560cdbb-33ed-4c2d-993a-906bbf6dae85	For Couples	for-couples	\N	https://res.cloudinary.com/djxuqljgr/image/upload/v1762900230/simri/categories/i4jajegbckwwkiaw108w.webp	\N	t	2025-11-11 22:30:32.130969+00	2025-11-11 22:30:32.130969+00
\.


--
-- Data for Name: coupon_usage; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.coupon_usage (id, coupon_id, user_id, order_id, used_at, discount_amount, created_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.coupons (id, code, name, description, type, value, minimum_order_amount, maximum_discount_amount, usage_limit, used_count, is_active, valid_from, valid_until, created_for_user, created_at, updated_at) FROM stdin;
89298e72-8b00-436f-b858-5cdedd742267	TEST40	test two	test two	fixed	149.00	1000.00	\N	1	0	t	\N	2025-09-23 00:00:00+00	\N	2025-09-20 05:16:21.584828+00	2025-09-20 05:16:21.584828+00
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.email_verification_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_history; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.inventory_history (id, product_id, change_type, quantity_change, previous_quantity, new_quantity, notes, user_id, order_id, created_at) FROM stdin;
b1b849d1-f5c6-4cf2-a759-8e58dddb8f9e	d3765acd-d702-4aec-95dd-101b1042078b	sale	-1	30	29	Stock reduced for order	\N	3bd5856d-e9f7-47be-bfe0-98e360bc1695	2025-09-17 05:21:52.263077+00
6cf73306-e2b0-4028-9532-72f93d95babe	d518d67a-3aea-4c04-962a-edd2d560759b	sale	-2	100	98	Stock reduced for order	\N	94f813cc-6870-4819-8148-858c7a81328f	2025-09-19 14:23:02.112969+00
32983941-d2cc-43aa-937a-0c3a2a2a0907	d518d67a-3aea-4c04-962a-edd2d560759b	sale	-2	98	96	Stock reduced for order	\N	d0b4ce82-6cf4-43aa-863c-103a0b068340	2025-09-19 14:25:39.589876+00
05b98bed-3c7a-4ef1-9ce8-9580083d2326	a4e988ac-0741-4fdf-b842-0a2220022fb3	sale	-6	69	63	Stock reduced for order	\N	f4398ebd-8dc4-4fb1-b873-145bfe924493	2025-09-19 14:36:36.139781+00
0fdf464d-515e-4475-ab04-d3bdd03b65c9	4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1	sale	-1	25	24	Stock reduced for order	\N	469016fb-ab76-4d09-9f2e-a784c58b0198	2025-09-19 14:43:13.542844+00
892f44fe-ee44-4282-890d-f07ceb9918b1	d3765acd-d702-4aec-95dd-101b1042078b	sale	-2	29	27	Stock reduced for order	\N	469016fb-ab76-4d09-9f2e-a784c58b0198	2025-09-19 14:43:13.551935+00
5b3d84d3-42c5-4351-a884-416d5267ec17	f09193e8-6b6e-405c-b162-75fb2b13697e	sale	-2	50	48	Stock reduced for order	\N	52c5c006-e032-4452-b641-72c16a609e57	2025-09-20 05:18:43.357266+00
24e3f9f3-b553-4477-88d5-37f7d4c66ee0	d518d67a-3aea-4c04-962a-edd2d560759b	sale	-1	96	95	Stock reduced for order	\N	a7d04e08-161d-4ecf-952b-52a1ce3eca1f	2025-09-20 07:12:35.990891+00
8ab15462-a4c6-4a28-a940-4adb633f68d5	d518d67a-3aea-4c04-962a-edd2d560759b	sale	-1	95	94	Stock reduced for order	\N	446cc715-de70-4c7c-b7a3-287fbf0989c2	2025-11-11 10:49:35.389395+00
1e28060b-bd65-4f21-9120-b533964f0225	d3765acd-d702-4aec-95dd-101b1042078b	sale	-1	27	26	Stock reduced for order	\N	1fa18b4e-f7f5-47a3-a9e8-cbf14a0e2974	2025-11-11 16:03:38.660629+00
b27686c8-c542-41d9-9cef-4b80a375109f	d3765acd-d702-4aec-95dd-101b1042078b	sale	-1	26	25	Stock reduced for order	\N	3aeec913-e1bc-4524-aa4b-7dc74011bbc3	2025-11-11 17:43:17.094585+00
\.


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.newsletter_subscribers (id, email, name, is_active, preferences, created_at, updated_at) FROM stdin;
cabf0eb9-3dd8-4a87-b16c-9237ad55abc3	husainadil202@gmail.com	Adil Husain	f	{"product_updates":true,"promotions":true}	2025-09-17 18:16:58.913793+00	2025-09-17 18:25:26.061379+00
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price, product_snapshot, created_at) FROM stdin;
55111363-0442-4961-8292-5b7c63c1e97c	9607b894-3e62-4a19-82b0-472408db8418	f09193e8-6b6e-405c-b162-75fb2b13697e	Personalized Photo Frame	PGF-001	1	749.00	749.00	{"id":"f09193e8-6b6e-405c-b162-75fb2b13697e","name":"Personalized Photo Frame","slug":"personalized-photo-frame","description":"Beautiful wooden photo frame with custom engraving. Perfect for preserving precious memories.","short_description":"Custom engraved wooden photo frame","sku":"PGF-001","price":"899.00","discount_price":"749.00","stock_quantity":50,"category_id":"cc45dd8c-b79d-49e6-b414-cbcb6d13abd1","images":["https://images.unsplash.com/photo-1757651885829-3ecc09b21382?q=80&w=2613&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1757285398769-31a5021afdcd?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.50","dimensions":{"length":20,"width":15,"height":2},"tags":["personalized","photo","frame","wooden"],"meta_title":"Custom Photo Frame - Personalized Gift","meta_description":"Beautiful wooden photo frame with custom engraving for your precious memories","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-15T20:12:24.822Z","category_name":"Birthday Gifts","average_rating":"0","total_reviews":0}	2025-09-15 20:13:16.921311+00
cad16d77-7ca3-4d9e-b6d1-f64a6141b2aa	9607b894-3e62-4a19-82b0-472408db8418	d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	LCB-001	1	1299.00	1299.00	{"id":"d3765acd-d702-4aec-95dd-101b1042078b","name":"Luxury Chocolate Box","slug":"luxury-chocolate-box","description":"Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.","short_description":"Premium assorted chocolates gift box","sku":"LCB-001","price":"1299.00","discount_price":null,"stock_quantity":30,"category_id":"b5f687f1-089a-4544-8e28-364af450bd5e","images":["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.80","dimensions":{"length":25,"width":20,"height":5},"tags":["chocolate","luxury","gift","sweet"],"meta_title":"Luxury Chocolate Gift Box","meta_description":"Premium assorted chocolates in elegant gift box perfect for any occasion","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-15T20:12:24.822Z","category_name":"Gifts for Her","average_rating":"0","total_reviews":0}	2025-09-15 20:13:16.927887+00
9ce94609-e6ed-4a8a-921e-0ce36c4ca4c7	17dd9977-8370-480b-a3d2-84ac7f4b5e01	f09193e8-6b6e-405c-b162-75fb2b13697e	Personalized Photo Frame	PGF-001	1	749.00	749.00	{"id":"f09193e8-6b6e-405c-b162-75fb2b13697e","name":"Personalized Photo Frame","slug":"personalized-photo-frame","description":"Beautiful wooden photo frame with custom engraving. Perfect for preserving precious memories.","short_description":"Custom engraved wooden photo frame","sku":"PGF-001","price":"899.00","discount_price":"749.00","stock_quantity":50,"category_id":"cc45dd8c-b79d-49e6-b414-cbcb6d13abd1","images":["https://images.unsplash.com/photo-1757651885829-3ecc09b21382?q=80&w=2613&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1757285398769-31a5021afdcd?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.50","dimensions":{"length":20,"width":15,"height":2},"tags":["personalized","photo","frame","wooden"],"meta_title":"Custom Photo Frame - Personalized Gift","meta_description":"Beautiful wooden photo frame with custom engraving for your precious memories","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-15T20:14:21.936Z","category_name":"Birthday Gifts","average_rating":"0","total_reviews":0}	2025-09-15 20:40:40.172845+00
5f4a1269-cfa4-4eac-a42f-1d295831cda1	3bd5856d-e9f7-47be-bfe0-98e360bc1695	d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	LCB-001	1	1299.00	1299.00	{"id":"d3765acd-d702-4aec-95dd-101b1042078b","name":"Luxury Chocolate Box","slug":"luxury-chocolate-box","description":"Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.","short_description":"Premium assorted chocolates gift box","sku":"LCB-001","price":"1299.00","discount_price":null,"stock_quantity":30,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.80","dimensions":{"length":25,"width":20,"height":5},"tags":["chocolate","luxury","gift","sweet"],"meta_title":"Luxury Chocolate Gift Box","meta_description":"Premium assorted chocolates in elegant gift box perfect for any occasion","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-16T06:51:25.447Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-17 05:21:52.260797+00
98ebeb72-9adb-47ca-9220-4e165626406a	e504ae1a-392b-4e69-acc5-e295569189cd	d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	CM-001	2	299.00	598.00	{"id":"d518d67a-3aea-4c04-962a-edd2d560759b","name":"Customized Mug","slug":"customized-mug","description":"High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.","short_description":"Custom design ceramic mug","sku":"CM-001","price":"399.00","discount_price":"299.00","stock_quantity":100,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.30","dimensions":{"length":12,"width":9,"height":10},"tags":["mug","ceramic","custom","personalized"],"meta_title":"Custom Ceramic Mug - Personalized Gift","meta_description":"High-quality ceramic mug with custom design perfect for daily use","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-17T06:07:22.130Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-19 14:20:28.445926+00
d319475a-1e5e-42d5-b28d-4830ba158734	94f813cc-6870-4819-8148-858c7a81328f	d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	CM-001	2	299.00	598.00	{"id":"d518d67a-3aea-4c04-962a-edd2d560759b","name":"Customized Mug","slug":"customized-mug","description":"High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.","short_description":"Custom design ceramic mug","sku":"CM-001","price":"399.00","discount_price":"299.00","stock_quantity":100,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.30","dimensions":{"length":12,"width":9,"height":10},"tags":["mug","ceramic","custom","personalized"],"meta_title":"Custom Ceramic Mug - Personalized Gift","meta_description":"High-quality ceramic mug with custom design perfect for daily use","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-17T06:07:22.130Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-19 14:23:02.09576+00
1f2943bd-ebbf-4f4b-88be-7e484b772968	d0b4ce82-6cf4-43aa-863c-103a0b068340	d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	CM-001	2	299.00	598.00	{"id":"d518d67a-3aea-4c04-962a-edd2d560759b","name":"Customized Mug","slug":"customized-mug","description":"High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.","short_description":"Custom design ceramic mug","sku":"CM-001","price":"399.00","discount_price":"299.00","stock_quantity":98,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.30","dimensions":{"length":12,"width":9,"height":10},"tags":["mug","ceramic","custom","personalized"],"meta_title":"Custom Ceramic Mug - Personalized Gift","meta_description":"High-quality ceramic mug with custom design perfect for daily use","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-19T14:23:02.099Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-19 14:25:39.57435+00
32334ece-d546-4554-a557-7a286b9390d8	f4398ebd-8dc4-4fb1-b873-145bfe924493	a4e988ac-0741-4fdf-b842-0a2220022fb3	test	FCK-200	6	150.00	900.00	{"id":"a4e988ac-0741-4fdf-b842-0a2220022fb3","name":"test","slug":"test","description":"heheh","short_description":"this is a test product","sku":"FCK-200","price":"200.00","discount_price":"150.00","stock_quantity":69,"category_id":"6703ffe9-6344-4bbd-8922-3857175c4a4e","images":[{"original":"https://res.cloudinary.com/djxuqljgr/image/upload/v1758090823/simri/products/db5e0311-3c88-4c8e-9b00-57299698fbde_original.jpg","thumb":"https://res.cloudinary.com/djxuqljgr/image/upload/v1758090825/simri/products/db5e0311-3c88-4c8e-9b00-57299698fbde_thumb.jpg","medium":"https://res.cloudinary.com/djxuqljgr/image/upload/v1758090827/simri/products/db5e0311-3c88-4c8e-9b00-57299698fbde_medium.jpg","large":"https://res.cloudinary.com/djxuqljgr/image/upload/v1758090828/simri/products/db5e0311-3c88-4c8e-9b00-57299698fbde_large.jpg"}],"is_featured":false,"is_active":true,"weight":"0.12","dimensions":{"length":10,"width":10,"height":25},"tags":["hello","there"],"meta_title":"meta title","meta_description":"hehehheh","created_at":"2025-09-17T06:33:50.051Z","updated_at":"2025-09-17T06:33:50.051Z","category_name":"Wedding Gifts","average_rating":"0","total_reviews":0}	2025-09-19 14:36:36.118116+00
9628becf-047c-4ee8-a62f-7f894e6ce4b4	469016fb-ab76-4d09-9f2e-a784c58b0198	4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1	Jewelry Box	JB-001	1	1299.00	1299.00	{"id":"4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1","name":"Jewelry Box","slug":"jewelry-box","description":"Elegant jewelry box with velvet interior and multiple compartments. Perfect for organizing jewelry.","short_description":"Elegant jewelry organizer box","sku":"JB-001","price":"1599.00","discount_price":"1299.00","stock_quantity":25,"category_id":"cc45dd8c-b79d-49e6-b414-cbcb6d13abd1","images":["https://images.unsplash.com/photo-1608716619640-83dda66aaad1?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756729927770-a42e4f8c7d86?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"1.50","dimensions":{"length":25,"width":15,"height":10},"tags":["jewelry","box","organizer","elegant"],"meta_title":"Elegant Jewelry Box - Perfect Gift","meta_description":"Beautiful jewelry box with velvet interior and multiple compartments","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-16T06:51:25.447Z","category_name":"Birthday Gifts","average_rating":"0","total_reviews":0}	2025-09-19 14:43:13.527953+00
b6ecd669-855a-4df2-a821-189e2e6fdbc4	469016fb-ab76-4d09-9f2e-a784c58b0198	d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	LCB-001	2	1299.00	2598.00	{"id":"d3765acd-d702-4aec-95dd-101b1042078b","name":"Luxury Chocolate Box","slug":"luxury-chocolate-box","description":"Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.","short_description":"Premium assorted chocolates gift box","sku":"LCB-001","price":"1299.00","discount_price":null,"stock_quantity":29,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.80","dimensions":{"length":25,"width":20,"height":5},"tags":["chocolate","luxury","gift","sweet"],"meta_title":"Luxury Chocolate Gift Box","meta_description":"Premium assorted chocolates in elegant gift box perfect for any occasion","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-17T06:07:48.010Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-19 14:43:13.548376+00
6749070e-262e-4b78-ad1a-560469b7a5bd	52c5c006-e032-4452-b641-72c16a609e57	f09193e8-6b6e-405c-b162-75fb2b13697e	Personalized Photo Frame	PGF-001	2	749.00	1498.00	{"id":"f09193e8-6b6e-405c-b162-75fb2b13697e","name":"Personalized Photo Frame","slug":"personalized-photo-frame","description":"Beautiful wooden photo frame with custom engraving. Perfect for preserving precious memories.","short_description":"Custom engraved wooden photo frame","sku":"PGF-001","price":"899.00","discount_price":"749.00","stock_quantity":50,"category_id":"b866a0c0-c3c5-469c-9e28-6199a801c361","images":["https://images.unsplash.com/photo-1757651885829-3ecc09b21382?q=80&w=2613&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1757285398769-31a5021afdcd?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.50","dimensions":{"length":20,"width":15,"height":2},"tags":["personalized","photo","frame","wooden"],"meta_title":"Custom Photo Frame - Personalized Gift","meta_description":"Beautiful wooden photo frame with custom engraving for your precious memories","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-16T06:51:25.447Z","category_name":"Personalized Gifts","average_rating":"0","total_reviews":0}	2025-09-20 05:18:43.339465+00
13842403-da45-4a59-81e8-3e8c4c7b31e4	a7d04e08-161d-4ecf-952b-52a1ce3eca1f	d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	CM-001	1	299.00	299.00	{"id":"d518d67a-3aea-4c04-962a-edd2d560759b","name":"Customized Mug","slug":"customized-mug","description":"High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.","short_description":"Custom design ceramic mug","sku":"CM-001","price":"399.00","discount_price":"299.00","stock_quantity":96,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.30","dimensions":{"length":12,"width":9,"height":10},"tags":["mug","ceramic","custom","personalized"],"meta_title":"Custom Ceramic Mug - Personalized Gift","meta_description":"High-quality ceramic mug with custom design perfect for daily use","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-19T14:25:39.576Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-09-20 07:12:35.984116+00
fe2efb90-5855-484c-a458-162b2be6d686	446cc715-de70-4c7c-b7a3-287fbf0989c2	d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	CM-001	1	299.00	299.00	{"id":"d518d67a-3aea-4c04-962a-edd2d560759b","name":"Customized Mug","slug":"customized-mug","description":"High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.","short_description":"Custom design ceramic mug","sku":"CM-001","price":"399.00","discount_price":"299.00","stock_quantity":95,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.30","dimensions":{"length":12,"width":9,"height":10},"tags":["mug","ceramic","custom","personalized"],"meta_title":"Custom Ceramic Mug - Personalized Gift","meta_description":"High-quality ceramic mug with custom design perfect for daily use","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-20T07:12:35.986Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-11-11 10:49:35.380816+00
173cbe29-e726-4322-a28a-d2292c2c857f	1fa18b4e-f7f5-47a3-a9e8-cbf14a0e2974	d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	LCB-001	1	1299.00	1299.00	{"id":"d3765acd-d702-4aec-95dd-101b1042078b","name":"Luxury Chocolate Box","slug":"luxury-chocolate-box","description":"Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.","short_description":"Premium assorted chocolates gift box","sku":"LCB-001","price":"1299.00","discount_price":null,"stock_quantity":27,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.80","dimensions":{"length":25,"width":20,"height":5},"tags":["chocolate","luxury","gift","sweet"],"meta_title":"Luxury Chocolate Gift Box","meta_description":"Premium assorted chocolates in elegant gift box perfect for any occasion","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-09-19T14:43:13.550Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-11-11 16:03:38.649105+00
622ad589-6456-4bd9-8694-7db406150400	3aeec913-e1bc-4524-aa4b-7dc74011bbc3	d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	LCB-001	1	1299.00	1299.00	{"id":"d3765acd-d702-4aec-95dd-101b1042078b","name":"Luxury Chocolate Box","slug":"luxury-chocolate-box","description":"Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.","short_description":"Premium assorted chocolates gift box","sku":"LCB-001","price":"1299.00","discount_price":null,"stock_quantity":26,"category_id":"93a07171-24f6-4f96-870f-4b59efa87d97","images":["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"],"is_featured":true,"is_active":true,"weight":"0.80","dimensions":{"length":25,"width":20,"height":5},"tags":["chocolate","luxury","gift","sweet"],"meta_title":"Luxury Chocolate Gift Box","meta_description":"Premium assorted chocolates in elegant gift box perfect for any occasion","created_at":"2025-09-15T20:12:24.822Z","updated_at":"2025-11-11T16:03:38.651Z","category_name":"Gifts for Him","average_rating":"0","total_reviews":0}	2025-11-11 17:43:17.083192+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.orders (id, user_id, order_number, status, payment_status, shipping_status, total_amount, tax_amount, shipping_amount, discount_amount, coupon_id, coupon_code, coupon_discount_amount, recommended_product, currency, shipping_address, billing_address, payment_method, payment_id, razorpay_order_id, razorpay_payment_id, tracking_number, shipped_at, delivered_at, notes, shiprocket_order_id, shiprocket_shipment_id, awb_number, courier_name, cancellation_reason, cancelled_at, refund_amount, refund_status, created_at, updated_at) FROM stdin;
d0b4ce82-6cf4-43aa-863c-103a0b068340	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758291939571257	pending	pending	not_shipped	705.64	107.64	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	\N	order_RJUaqCZq3RUexJ	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-19 14:25:39.570874+00	2025-09-19 14:25:39.79966+00
9607b894-3e62-4a19-82b0-472408db8418	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	ORD1757967196916153	cancelled	paid	not_shipped	2416.64	368.64	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RI0NkXeeWvtLOf	order_RI0NZvCtsWIB44	pay_RI0NkXeeWvtLOf	\N	\N	\N	\N	\N	\N	\N	\N	fuck you	2025-09-15 20:14:21.943026+00	2416.64	pending	2025-09-15 20:13:16.916495+00	2025-09-15 20:14:21.943026+00
3bd5856d-e9f7-47be-bfe0-98e360bc1695	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758086512238330	confirmed	paid	not_shipped	1768.82	269.82	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RIYGLJcOf5dEYJ	order_RIYGCOB4qb8a68	pay_RIYGLJcOf5dEYJ	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-17 05:21:52.238143+00	2025-09-17 05:22:14.457674+00
e504ae1a-392b-4e69-acc5-e295569189cd	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758291628444788	pending	pending	not_shipped	705.64	107.64	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-19 14:20:28.441445+00	2025-09-19 14:20:28.441445+00
17dd9977-8370-480b-a3d2-84ac7f4b5e01	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	ORD1757968840169902	confirmed	paid	not_shipped	883.82	134.82	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RI0qbevAqRharz	order_RI0qUnSp7jSSBi	pay_RI0qbevAqRharz	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-15 20:40:40.168732+00	2025-09-15 20:40:59.11809+00
94f813cc-6870-4819-8148-858c7a81328f	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758291782090721	confirmed	paid	not_shipped	705.64	107.64	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RJUYJT7BPsa86e	order_RJUY54OwJ5ByJ0	pay_RJUYJT7BPsa86e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-19 14:23:02.089622+00	2025-09-19 14:23:28.558966+00
f4398ebd-8dc4-4fb1-b873-145bfe924493	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758292596112996	confirmed	paid	not_shipped	1054.80	145.80	99.00	90.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RJUmW3BwNOSU3E	order_RJUmOs7ShsiHhh	pay_RJUmW3BwNOSU3E	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-19 14:36:36.112334+00	2025-09-20 05:14:41.099335+00
469016fb-ab76-4d09-9f2e-a784c58b0198	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758292993522326	confirmed	paid	not_shipped	4480.46	683.46	0.00	100.00	\N	TEST	100.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RJUtWvHiRb2Dn7	order_RJUtOgeYTm0yx2	pay_RJUtWvHiRb2Dn7	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-19 14:43:13.522977+00	2025-09-20 05:14:41.099335+00
52c5c006-e032-4452-b641-72c16a609e57	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758345523332586	confirmed	paid	not_shipped	1414.11	215.71	0.00	299.60	\N	TEST20	299.60	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RJjoNS4j7foDa4	order_RJjoE9ilSX5ya7	pay_RJjoNS4j7foDa4	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-09-20 05:18:43.332981+00	2025-09-20 05:37:23.72438+00
a7d04e08-161d-4ecf-952b-52a1ce3eca1f	dceb408d-2a45-4d4f-8784-22435ae0fe9e	ORD1758352355980147	cancelled	paid	not_shipped	451.82	53.82	99.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_RJlkevmW000QQ0	order_RJlkWDo7cDqkyJ	pay_RJlkevmW000QQ0	\N	\N	\N	\N	\N	\N	\N	\N	fuck	2025-09-21 12:16:34.686313+00	\N	pending	2025-09-20 07:12:35.980197+00	2025-09-21 12:16:34.686313+00
446cc715-de70-4c7c-b7a3-287fbf0989c2	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	ORD1762858175375295	pending	pending	not_shipped	451.82	53.82	99.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	\N	order_RePE0lNVI6lO7Q	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-11-11 10:49:35.375757+00	2025-11-11 10:49:37.154237+00
1fa18b4e-f7f5-47a3-a9e8-cbf14a0e2974	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	ORD1762877018643096	confirmed	paid	not_shipped	1532.82	233.82	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_ReUZyROMmY5RLs	order_ReUZkB5lysgF3H	pay_ReUZyROMmY5RLs	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-11-11 16:03:38.643704+00	2025-11-11 16:04:43.401496+00
3aeec913-e1bc-4524-aa4b-7dc74011bbc3	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	ORD1762882997058867	confirmed	paid	not_shipped	1532.82	233.82	0.00	0.00	\N	\N	0.00	f	INR	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	{"type":"shipping","first_name":"Adil","last_name":"Husain","company":"","address_line_1":"Salaria Home PG, Bhutani Colony","address_line_2":"","city":"Phagwara","state":"Punjab","country":"India","postal_code":"144411","phone":"8604135956","is_default":true}	razorpay	pay_ReWH6qrCB5xrKT	order_ReWGztXG8dJpyU	pay_ReWH6qrCB5xrKT	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	none	2025-11-11 17:43:17.079149+00	2025-11-11 17:43:36.857634+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: product_purchase_patterns; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.product_purchase_patterns (id, product_id, co_purchased_with, frequency, created_at, updated_at) FROM stdin;
00833a31-ec4a-4520-ac62-209f349e7f8b	f09193e8-6b6e-405c-b162-75fb2b13697e	d3765acd-d702-4aec-95dd-101b1042078b	1	2025-09-15 20:13:16.934819+00	2025-09-15 20:13:16.934819+00
5b9f5439-9afb-4a03-a5d0-003e9b8f8d3a	d3765acd-d702-4aec-95dd-101b1042078b	f09193e8-6b6e-405c-b162-75fb2b13697e	1	2025-09-15 20:13:16.934819+00	2025-09-15 20:13:16.934819+00
ea1814c2-660a-4436-9395-e513c85bf2b8	4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1	d3765acd-d702-4aec-95dd-101b1042078b	1	2025-09-19 14:43:13.559283+00	2025-09-19 14:43:13.559283+00
6a9cab0c-badf-411d-87f8-4e870f88e4d6	d3765acd-d702-4aec-95dd-101b1042078b	4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1	1	2025-09-19 14:43:13.559283+00	2025-09-19 14:43:13.559283+00
\.


--
-- Data for Name: product_reviews_summary; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.product_reviews_summary (product_id, average_rating, total_reviews, rating_distribution, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.products (id, name, slug, description, short_description, sku, price, discount_price, stock_quantity, category_id, images, is_featured, is_active, weight, dimensions, tags, meta_title, meta_description, created_at, updated_at) FROM stdin;
d518d67a-3aea-4c04-962a-edd2d560759b	Customized Mug	customized-mug	High-quality ceramic mug with your custom design or message. Dishwasher and microwave safe.	Custom design ceramic mug	CM-001	399.00	299.00	94	93a07171-24f6-4f96-870f-4b59efa87d97	["https://images.unsplash.com/photo-1757071018435-49dae03ed383?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756747840159-f81cc8607ece?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	t	t	0.30	{"length":12,"width":9,"height":10}	{mug,ceramic,custom,personalized}	Custom Ceramic Mug - Personalized Gift	High-quality ceramic mug with custom design perfect for daily use	2025-09-15 20:12:24.822193+00	2025-11-11 10:49:35.383322+00
f09193e8-6b6e-405c-b162-75fb2b13697e	Personalized Photo Frame	personalized-photo-frame	Beautiful wooden photo frame with custom engraving. Perfect for preserving precious memories.	Custom engraved wooden photo frame	PGF-001	899.00	749.00	48	73de7f38-0310-49fd-987f-433879e10c66	["https://images.unsplash.com/photo-1757651885829-3ecc09b21382?q=80&w=2613&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1757285398769-31a5021afdcd?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	t	t	0.50	{"length":20,"width":15,"height":2}	{personalized,photo,frame,wooden}	Custom Photo Frame - Personalized Gift	Beautiful wooden photo frame with custom engraving for your precious memories	2025-09-15 20:12:24.822193+00	2025-11-11 23:21:28.626915+00
d3765acd-d702-4aec-95dd-101b1042078b	Luxury Chocolate Box	luxury-chocolate-box	Premium assorted chocolates in an elegant gift box. Contains 20 pieces of handcrafted chocolates.	Premium assorted chocolates gift box	LCB-001	1299.00	\N	25	93a07171-24f6-4f96-870f-4b59efa87d97	["https://images.unsplash.com/photo-1757366224288-076dfeb5ef8e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756745678835-00315541d465?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	t	t	0.80	{"length":25,"width":20,"height":5}	{chocolate,luxury,gift,sweet}	Luxury Chocolate Gift Box	Premium assorted chocolates in elegant gift box perfect for any occasion	2025-09-15 20:12:24.822193+00	2025-11-11 17:43:17.084743+00
a4e988ac-0741-4fdf-b842-0a2220022fb3	test	test	heheh	this is a test product	FCK-200	200.00	150.00	63	b5f687f1-089a-4544-8e28-364af450bd5e	["https://res.cloudinary.com/djxuqljgr/image/upload/v1758090827/simri/products/db5e0311-3c88-4c8e-9b00-57299698fbde_medium.jpg"]	t	t	0.12	{"length":10,"width":10,"height":25}	{hello,there}	meta title	hehehheh	2025-09-17 06:33:50.051821+00	2025-11-11 23:21:19.30744+00
4dabcfe8-3725-4795-b7d6-c33cdcd2e5f1	Jewelry Box	jewelry-box	Elegant jewelry box with velvet interior and multiple compartments. Perfect for organizing jewelry.	Elegant jewelry organizer box	JB-001	1599.00	1299.00	24	cc45dd8c-b79d-49e6-b414-cbcb6d13abd1	["https://images.unsplash.com/photo-1608716619640-83dda66aaad1?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D","https://images.unsplash.com/photo-1756729927770-a42e4f8c7d86?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"]	t	t	1.50	{"length":25,"width":15,"height":10}	{jewelry,box,organizer,elegant}	Elegant Jewelry Box - Perfect Gift	Beautiful jewelry box with velvet interior and multiple compartments	2025-09-15 20:12:24.822193+00	2025-09-19 14:43:13.530437+00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.reviews (id, user_id, product_id, order_id, rating, title, comment, images, is_verified_purchase, is_approved, helpful_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_reservations; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.stock_reservations (id, product_id, quantity, reserved_until, session_id, user_id, order_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.users (id, google_id, email, name, password_hash, phone, avatar_url, role, auth_provider, is_verified, email_verified_at, last_login_at, created_at, updated_at) FROM stdin;
af3a74da-765a-4952-b3c6-3fe4f49e6aa4	google-test-id-123	test@example.com	Test User	\N	\N	\N	customer	google	t	\N	\N	2025-09-15 20:12:24.822193+00	2025-09-15 20:12:24.822193+00
50a9e0b1-b5e3-4d92-833b-16efcbcf9451	109740765039216409090	husainadil202@gmail.com	Adil Husain	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocJP27B7UXY9Jct0R1NDaWf6Ndfefh5q4r4iybCWNZnXGHct8WtK=s96-c	customer	google	t	\N	\N	2025-09-15 20:12:33.056629+00	2025-09-15 20:12:33.056629+00
dceb408d-2a45-4d4f-8784-22435ae0fe9e	\N	admin@simri.com	Admin User	$2b$10$BZNxt1nSclzIjfumRocAyuxvbS0zhE0IT6KJYR26kEQaP5T0NwPju	\N	\N	admin	local	t	\N	2025-11-11 22:21:36.605402+00	2025-09-16 06:51:25.447962+00	2025-11-11 22:21:36.605402+00
\.


--
-- Data for Name: wishlists; Type: TABLE DATA; Schema: public; Owner: simri_user
--

COPY public.wishlists (id, user_id, product_id, created_at) FROM stdin;
ccf9a5d3-1b9d-4226-99d1-5a439b723439	dceb408d-2a45-4d4f-8784-22435ae0fe9e	d518d67a-3aea-4c04-962a-edd2d560759b	2025-09-17 17:59:18.716855+00
1732b5cd-fa13-4f7e-8b57-642dac3c75e5	50a9e0b1-b5e3-4d92-833b-16efcbcf9451	d518d67a-3aea-4c04-962a-edd2d560759b	2025-11-11 11:02:43.490661+00
\.


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_abandonment_tracking cart_abandonment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_abandonment_tracking
    ADD CONSTRAINT cart_abandonment_tracking_pkey PRIMARY KEY (id);


--
-- Name: cart_abandonment_tracking cart_abandonment_tracking_user_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_abandonment_tracking
    ADD CONSTRAINT cart_abandonment_tracking_user_id_key UNIQUE (user_id);


--
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: coupon_usage coupon_usage_coupon_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_user_id_order_id_key UNIQUE (coupon_id, user_id, order_id);


--
-- Name: coupon_usage coupon_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_key UNIQUE (token);


--
-- Name: inventory_history inventory_history_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.inventory_history
    ADD CONSTRAINT inventory_history_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: product_purchase_patterns product_purchase_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_purchase_patterns
    ADD CONSTRAINT product_purchase_patterns_pkey PRIMARY KEY (id);


--
-- Name: product_purchase_patterns product_purchase_patterns_product_id_co_purchased_with_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_purchase_patterns
    ADD CONSTRAINT product_purchase_patterns_product_id_co_purchased_with_key UNIQUE (product_id, co_purchased_with);


--
-- Name: product_reviews_summary product_reviews_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_reviews_summary
    ADD CONSTRAINT product_reviews_summary_pkey PRIMARY KEY (product_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_user_id_product_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_product_id_order_id_key UNIQUE (user_id, product_id, order_id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: idx_cart_abandonment_abandoned; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_abandonment_abandoned ON public.cart_abandonment_tracking USING btree (is_abandoned, abandoned_at);


--
-- Name: idx_cart_abandonment_recovered; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_abandonment_recovered ON public.cart_abandonment_tracking USING btree (is_recovered);


--
-- Name: idx_cart_abandonment_reminders; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_abandonment_reminders ON public.cart_abandonment_tracking USING btree (reminder_count, last_reminder_sent);


--
-- Name: idx_cart_abandonment_user_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_abandonment_user_id ON public.cart_abandonment_tracking USING btree (user_id);


--
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_product_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_cart_items_product_id ON public.cart_items USING btree (product_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_coupon_usage_coupon_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_coupon_usage_coupon_id ON public.coupon_usage USING btree (coupon_id);


--
-- Name: idx_coupon_usage_coupon_user; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_coupon_usage_coupon_user ON public.coupon_usage USING btree (coupon_id, user_id);


--
-- Name: idx_coupon_usage_used_at; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_coupon_usage_used_at ON public.coupon_usage USING btree (used_at);


--
-- Name: idx_coupon_usage_user_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_coupon_usage_user_id ON public.coupon_usage USING btree (user_id);


--
-- Name: idx_inventory_history_created_at; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_inventory_history_created_at ON public.inventory_history USING btree (created_at);


--
-- Name: idx_inventory_history_product_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_inventory_history_product_id ON public.inventory_history USING btree (product_id);


--
-- Name: idx_newsletter_subscribers_created_at; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_newsletter_subscribers_created_at ON public.newsletter_subscribers USING btree (created_at);


--
-- Name: idx_newsletter_subscribers_email; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_newsletter_subscribers_email ON public.newsletter_subscribers USING btree (email);


--
-- Name: idx_newsletter_subscribers_is_active; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_newsletter_subscribers_is_active ON public.newsletter_subscribers USING btree (is_active);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_coupon_code; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_orders_coupon_code ON public.orders USING btree (coupon_code);


--
-- Name: idx_orders_coupon_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_orders_coupon_id ON public.orders USING btree (coupon_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- Name: idx_products_is_featured; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_products_is_featured ON public.products USING btree (is_featured);


--
-- Name: idx_products_slug; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_products_slug ON public.products USING btree (slug);


--
-- Name: idx_purchase_patterns_frequency; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_purchase_patterns_frequency ON public.product_purchase_patterns USING btree (frequency DESC);


--
-- Name: idx_purchase_patterns_product_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_purchase_patterns_product_id ON public.product_purchase_patterns USING btree (product_id);


--
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- Name: idx_reviews_summary_rating; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_reviews_summary_rating ON public.product_reviews_summary USING btree (average_rating DESC);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_stock_reservations_product_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_stock_reservations_product_id ON public.stock_reservations USING btree (product_id);


--
-- Name: idx_stock_reservations_reserved_until; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_stock_reservations_reserved_until ON public.stock_reservations USING btree (reserved_until);


--
-- Name: idx_stock_reservations_status; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_stock_reservations_status ON public.stock_reservations USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: simri_user
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_abandonment_tracking update_cart_abandonment_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_cart_abandonment_tracking_updated_at BEFORE UPDATE ON public.cart_abandonment_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: carts update_carts_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coupons update_coupons_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: newsletter_subscribers update_newsletter_subscribers_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_purchase_patterns update_purchase_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_purchase_patterns_updated_at BEFORE UPDATE ON public.product_purchase_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: simri_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_abandonment_tracking cart_abandonment_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_abandonment_tracking
    ADD CONSTRAINT cart_abandonment_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: coupon_usage coupon_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupon_usage
    ADD CONSTRAINT coupon_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: coupons coupons_created_for_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_created_for_user_fkey FOREIGN KEY (created_for_user) REFERENCES public.users(id);


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: inventory_history inventory_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.inventory_history
    ADD CONSTRAINT inventory_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: inventory_history inventory_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.inventory_history
    ADD CONSTRAINT inventory_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: inventory_history inventory_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.inventory_history
    ADD CONSTRAINT inventory_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_purchase_patterns product_purchase_patterns_co_purchased_with_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_purchase_patterns
    ADD CONSTRAINT product_purchase_patterns_co_purchased_with_fkey FOREIGN KEY (co_purchased_with) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_purchase_patterns product_purchase_patterns_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_purchase_patterns
    ADD CONSTRAINT product_purchase_patterns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews_summary product_reviews_summary_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.product_reviews_summary
    ADD CONSTRAINT product_reviews_summary_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: wishlists wishlists_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: simri_user
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict vwvAzqCMdVvkmEuJxulZZCGQ4pcdaEelYY6QqcoH4LOTsHgWnnboAa17omeqck0

