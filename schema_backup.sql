--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    account_name character varying(100) NOT NULL,
    account_type character varying(20) NOT NULL,
    contact_person character varying(100),
    phone character varying(20),
    email character varying(100),
    address text,
    opening_balance numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying])::text[])))
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: contractor_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractor_payments (
    id integer NOT NULL,
    contractor_id integer,
    payment_month integer NOT NULL,
    payment_year integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'PAID'::character varying
);


ALTER TABLE public.contractor_payments OWNER TO postgres;

--
-- Name: contractor_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contractor_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contractor_payments_id_seq OWNER TO postgres;

--
-- Name: contractor_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contractor_payments_id_seq OWNED BY public.contractor_payments.id;


--
-- Name: contractor_salary_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractor_salary_history (
    id integer NOT NULL,
    contractor_id integer,
    previous_salary numeric(10,2),
    new_salary numeric(10,2),
    effective_month integer,
    effective_year integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contractor_salary_history OWNER TO postgres;

--
-- Name: contractor_salary_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contractor_salary_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contractor_salary_history_id_seq OWNER TO postgres;

--
-- Name: contractor_salary_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contractor_salary_history_id_seq OWNED BY public.contractor_salary_history.id;


--
-- Name: contractors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractors (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    monthly_salary numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.contractors OWNER TO postgres;

--
-- Name: contractors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contractors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contractors_id_seq OWNER TO postgres;

--
-- Name: contractors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contractors_id_seq OWNED BY public.contractors.id;


--
-- Name: daily_attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_attendance (
    id integer NOT NULL,
    employee_id character varying(20),
    attendance_date date NOT NULL,
    status character varying(20) NOT NULL,
    in_time time without time zone,
    out_time time without time zone,
    overtime numeric(4,2) DEFAULT 0,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    salary_for_day numeric(10,2) DEFAULT 0,
    CONSTRAINT daily_attendance_status_check CHECK (((status)::text = ANY ((ARRAY['Present'::character varying, 'Absent'::character varying, 'Half Day'::character varying, 'On Leave'::character varying, 'Holiday'::character varying, 'Weekend'::character varying])::text[])))
);


ALTER TABLE public.daily_attendance OWNER TO postgres;

--
-- Name: daily_attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_attendance_id_seq OWNER TO postgres;

--
-- Name: daily_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_attendance_id_seq OWNED BY public.daily_attendance.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    department_id integer,
    designation character varying(100) NOT NULL,
    joining_date date NOT NULL,
    salary numeric(12,2) NOT NULL,
    phone character varying(20),
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    termination_date date,
    separation_type character varying(20),
    due_salary numeric(10,2) DEFAULT 0,
    CONSTRAINT valid_employee_separation_type CHECK (((separation_type)::text = ANY ((ARRAY['terminate'::character varying, 'resign'::character varying])::text[])))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employee_details; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.employee_details AS
 SELECT e.id,
    e.first_name,
    e.last_name,
    e.department_id,
    d.name AS department_name,
    e.designation,
    e.joining_date,
    e.salary,
    e.phone,
    e.status,
    e.created_at
   FROM (public.employees e
     LEFT JOIN public.departments d ON ((e.department_id = d.id)));


ALTER VIEW public.employee_details OWNER TO postgres;

--
-- Name: final_settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.final_settlements (
    id integer NOT NULL,
    employee_id character varying(10),
    separation_type character varying(20) NOT NULL,
    last_working_date date NOT NULL,
    due_salary numeric(10,2) NOT NULL,
    loan_deductions numeric(10,2) DEFAULT 0,
    advance_deductions numeric(10,2) DEFAULT 0,
    net_settlement numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_separation_type CHECK (((separation_type)::text = ANY ((ARRAY['terminate'::character varying, 'resign'::character varying])::text[])))
);


ALTER TABLE public.final_settlements OWNER TO postgres;

--
-- Name: final_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.final_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.final_settlements_id_seq OWNER TO postgres;

--
-- Name: final_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.final_settlements_id_seq OWNED BY public.final_settlements.id;


--
-- Name: gate_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gate_entries (
    id integer NOT NULL,
    grn_number character varying(50) NOT NULL,
    entry_type character varying(20) NOT NULL,
    supplier_id integer,
    purchaser_id integer,
    vehicle_type character varying(20),
    vehicle_number character varying(20) NOT NULL,
    driver_name character varying(100),
    item_type character varying(50),
    paper_type character varying(50),
    quantity numeric(10,2) NOT NULL,
    unit character varying(10) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    has_return boolean DEFAULT false,
    CONSTRAINT gate_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['PURCHASE_IN'::character varying, 'SALE_OUT'::character varying, 'PURCHASE_RETURN'::character varying, 'SALE_RETURN'::character varying])::text[])))
);


ALTER TABLE public.gate_entries OWNER TO postgres;

--
-- Name: gate_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gate_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gate_entries_id_seq OWNER TO postgres;

--
-- Name: gate_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gate_entries_id_seq OWNED BY public.gate_entries.id;


--
-- Name: gate_entries_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gate_entries_pricing (
    id integer NOT NULL,
    entry_type character varying(20) NOT NULL,
    grn_number character varying(50) NOT NULL,
    account_id integer,
    item_id integer,
    quantity numeric(10,2) NOT NULL,
    price_per_unit numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    original_grn_number character varying(50),
    cut_weight numeric(10,2) DEFAULT 0,
    final_quantity numeric(10,2),
    CONSTRAINT gate_entries_pricing_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'SALE'::character varying, 'PURCHASE_RETURN'::character varying, 'SALE_RETURN'::character varying])::text[]))),
    CONSTRAINT gate_entries_pricing_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSED'::character varying])::text[])))
);


ALTER TABLE public.gate_entries_pricing OWNER TO postgres;

--
-- Name: gate_entries_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gate_entries_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gate_entries_pricing_id_seq OWNER TO postgres;

--
-- Name: gate_entries_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gate_entries_pricing_id_seq OWNED BY public.gate_entries_pricing.id;


--
-- Name: gate_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gate_returns (
    id integer NOT NULL,
    return_number character varying(50) NOT NULL,
    original_grn_number character varying(50),
    return_type character varying(20) NOT NULL,
    return_quantity numeric(10,2) NOT NULL,
    return_reason character varying(100) NOT NULL,
    vehicle_type character varying(20),
    vehicle_number character varying(20) NOT NULL,
    driver_name character varying(100),
    date_time timestamp without time zone NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gate_returns_return_type_check CHECK (((return_type)::text = ANY ((ARRAY['PURCHASE_RETURN'::character varying, 'SALE_RETURN'::character varying])::text[])))
);


ALTER TABLE public.gate_returns OWNER TO postgres;

--
-- Name: gate_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.gate_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gate_returns_id_seq OWNER TO postgres;

--
-- Name: gate_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.gate_returns_id_seq OWNED BY public.gate_returns.id;


--
-- Name: leave_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_applications (
    id integer NOT NULL,
    employee_id character varying(20),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text NOT NULL,
    leave_with_pay boolean DEFAULT true,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    approved_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT leave_applications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.leave_applications OWNER TO postgres;

--
-- Name: leave_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_applications_id_seq OWNER TO postgres;

--
-- Name: leave_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_applications_id_seq OWNED BY public.leave_applications.id;


--
-- Name: loan_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan_applications (
    id integer NOT NULL,
    employee_id character varying(20),
    loan_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    installments integer NOT NULL,
    start_month date NOT NULL,
    end_month date NOT NULL,
    monthly_installment numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    approved_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loan_applications_loan_type_check CHECK (((loan_type)::text = ANY ((ARRAY['loan'::character varying, 'advance'::character varying])::text[]))),
    CONSTRAINT loan_applications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE public.loan_applications OWNER TO postgres;

--
-- Name: loan_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loan_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loan_applications_id_seq OWNER TO postgres;

--
-- Name: loan_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loan_applications_id_seq OWNED BY public.loan_applications.id;


--
-- Name: loan_installments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan_installments (
    id integer NOT NULL,
    loan_application_id integer,
    installment_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid boolean DEFAULT false,
    paid_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.loan_installments OWNER TO postgres;

--
-- Name: loan_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loan_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loan_installments_id_seq OWNER TO postgres;

--
-- Name: loan_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loan_installments_id_seq OWNED BY public.loan_installments.id;


--
-- Name: maintenance_grn_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_grn_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_grn_seq OWNER TO postgres;

--
-- Name: maintenance_issue_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_issue_items (
    id integer NOT NULL,
    issue_id integer,
    item_code character varying(50),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_issue_items OWNER TO postgres;

--
-- Name: maintenance_issue_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_issue_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_issue_items_id_seq OWNER TO postgres;

--
-- Name: maintenance_issue_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_issue_items_id_seq OWNED BY public.maintenance_issue_items.id;


--
-- Name: maintenance_issues; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_issues (
    id integer NOT NULL,
    department_code character varying(50),
    issue_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.maintenance_issues OWNER TO postgres;

--
-- Name: maintenance_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenance_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenance_issues_id_seq OWNER TO postgres;

--
-- Name: maintenance_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenance_issues_id_seq OWNED BY public.maintenance_issues.id;


--
-- Name: monthly_price_averages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_price_averages (
    id integer NOT NULL,
    item_type character varying(100) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    average_price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.monthly_price_averages OWNER TO postgres;

--
-- Name: monthly_price_averages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.monthly_price_averages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.monthly_price_averages_id_seq OWNER TO postgres;

--
-- Name: monthly_price_averages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.monthly_price_averages_id_seq OWNED BY public.monthly_price_averages.id;


--
-- Name: monthly_salary_totals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_salary_totals (
    id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_status character varying(20) DEFAULT 'PAID'::character varying
);


ALTER TABLE public.monthly_salary_totals OWNER TO postgres;

--
-- Name: monthly_salary_totals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.monthly_salary_totals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.monthly_salary_totals_id_seq OWNER TO postgres;

--
-- Name: monthly_salary_totals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.monthly_salary_totals_id_seq OWNED BY public.monthly_salary_totals.id;


--
-- Name: pricing_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricing_entries (
    id integer NOT NULL,
    entry_type character varying(50) NOT NULL,
    reference_id integer NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit character varying(20) NOT NULL,
    price_per_unit numeric(10,2),
    total_amount numeric(10,2),
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    return_grn character varying(50),
    item_name character varying(255),
    CONSTRAINT pricing_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'SALE'::character varying, 'PURCHASE_RETURN'::character varying, 'SALE_RETURN'::character varying, 'STORE_PURCHASE'::character varying, 'STORE_RETURN'::character varying])::text[]))),
    CONSTRAINT pricing_entries_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSED'::character varying])::text[])))
);


ALTER TABLE public.pricing_entries OWNER TO postgres;

--
-- Name: pricing_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pricing_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pricing_entries_id_seq OWNER TO postgres;

--
-- Name: pricing_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricing_entries_id_seq OWNED BY public.pricing_entries.id;


--
-- Name: production; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production (
    id integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    paper_type character varying(50) NOT NULL,
    total_weight numeric(10,2) NOT NULL,
    total_reels integer NOT NULL,
    boiler_fuel_type character varying(50),
    boiler_fuel_quantity numeric(10,2),
    boiler_fuel_cost numeric(10,2),
    total_yield_percentage numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    electricity_units numeric(10,2),
    electricity_unit_price numeric(10,2),
    electricity_cost numeric(10,2),
    CONSTRAINT production_boiler_fuel_type_check CHECK (((boiler_fuel_type)::text = ANY ((ARRAY['Boiler Fuel (Toori)'::character varying, 'Boiler Fuel (Tukka)'::character varying])::text[]))),
    CONSTRAINT production_paper_type_check CHECK (((paper_type)::text = ANY ((ARRAY['SUPER'::character varying, 'CMP'::character varying, 'BOARD'::character varying])::text[])))
);


ALTER TABLE public.production OWNER TO postgres;

--
-- Name: production_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_id_seq OWNER TO postgres;

--
-- Name: production_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_id_seq OWNED BY public.production.id;


--
-- Name: production_recipe; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_recipe (
    id integer NOT NULL,
    production_id integer,
    raddi_type character varying(100) NOT NULL,
    percentage_used numeric(5,2) NOT NULL,
    quantity_used numeric(10,2) NOT NULL,
    yield_percentage numeric(5,2)
);


ALTER TABLE public.production_recipe OWNER TO postgres;

--
-- Name: production_recipe_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_recipe_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_recipe_id_seq OWNER TO postgres;

--
-- Name: production_recipe_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_recipe_id_seq OWNED BY public.production_recipe.id;


--
-- Name: production_reels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_reels (
    id integer NOT NULL,
    production_id integer,
    size character varying(50) NOT NULL,
    weight numeric(10,2) NOT NULL
);


ALTER TABLE public.production_reels OWNER TO postgres;

--
-- Name: production_reels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_reels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_reels_id_seq OWNER TO postgres;

--
-- Name: production_reels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_reels_id_seq OWNED BY public.production_reels.id;


--
-- Name: purchasers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchasers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    contact character varying(50),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.purchasers OWNER TO postgres;

--
-- Name: purchasers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchasers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchasers_id_seq OWNER TO postgres;

--
-- Name: purchasers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchasers_id_seq OWNED BY public.purchasers.id;


--
-- Name: salary_increments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_increments (
    id integer NOT NULL,
    employee_id character varying(20),
    previous_salary numeric(12,2) NOT NULL,
    new_salary numeric(12,2) NOT NULL,
    effective_date date NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.salary_increments OWNER TO postgres;

--
-- Name: salary_increments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_increments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_increments_id_seq OWNER TO postgres;

--
-- Name: salary_increments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_increments_id_seq OWNED BY public.salary_increments.id;


--
-- Name: salary_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_payments (
    id integer NOT NULL,
    employee_id character varying(50),
    payment_month integer NOT NULL,
    payment_year integer NOT NULL,
    basic_salary numeric(10,2) NOT NULL,
    overtime_amount numeric(10,2) DEFAULT 0,
    deductions numeric(10,2) DEFAULT 0,
    net_amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    status character varying(20) DEFAULT 'PAID'::character varying
);


ALTER TABLE public.salary_payments OWNER TO postgres;

--
-- Name: salary_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_payments_id_seq OWNER TO postgres;

--
-- Name: salary_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_payments_id_seq OWNED BY public.salary_payments.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustments (
    id integer NOT NULL,
    item_type character varying(50) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    adjustment_type character varying(50) NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id integer NOT NULL,
    date_time timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_adjustments OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_adjustments_id_seq OWNER TO postgres;

--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_adjustments_id_seq OWNED BY public.stock_adjustments.id;


--
-- Name: store_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_entries (
    id integer NOT NULL,
    grn_number character varying(50),
    entry_type character varying(20) NOT NULL,
    item_id integer,
    quantity numeric(10,2) NOT NULL,
    unit character varying(20) NOT NULL,
    vendor_id integer,
    department character varying(100),
    issued_to character varying(100),
    vehicle_number character varying(20),
    driver_name character varying(100),
    date_time timestamp without time zone NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reference_type character varying(50),
    reference_id integer,
    CONSTRAINT store_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['STORE_IN'::character varying, 'STORE_OUT'::character varying, 'STORE_RETURN'::character varying])::text[])))
);


ALTER TABLE public.store_entries OWNER TO postgres;

--
-- Name: store_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_entries_id_seq OWNER TO postgres;

--
-- Name: store_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_entries_id_seq OWNED BY public.store_entries.id;


--
-- Name: store_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_items (
    id integer NOT NULL,
    item_name character varying(100) NOT NULL,
    item_code character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(20) NOT NULL,
    current_stock numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.store_items OWNER TO postgres;

--
-- Name: store_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_items_id_seq OWNER TO postgres;

--
-- Name: store_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_items_id_seq OWNED BY public.store_items.id;


--
-- Name: store_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_returns (
    id integer NOT NULL,
    grn_number character varying(50) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    return_grn character varying(50),
    item_name character varying(255),
    unit character varying(50)
);


ALTER TABLE public.store_returns OWNER TO postgres;

--
-- Name: store_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_returns_id_seq OWNER TO postgres;

--
-- Name: store_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_returns_id_seq OWNED BY public.store_returns.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    contact character varying(50),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    transaction_date timestamp without time zone NOT NULL,
    account_id integer,
    reference_no character varying(50) NOT NULL,
    entry_type character varying(20) NOT NULL,
    amount numeric(15,2) NOT NULL,
    description text,
    item_name character varying(100),
    quantity numeric(10,2),
    unit character varying(20),
    price_per_unit numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: workers_salary_totals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workers_salary_totals (
    id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.workers_salary_totals OWNER TO postgres;

--
-- Name: workers_salary_totals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.workers_salary_totals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.workers_salary_totals_id_seq OWNER TO postgres;

--
-- Name: workers_salary_totals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.workers_salary_totals_id_seq OWNED BY public.workers_salary_totals.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: contractor_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_payments ALTER COLUMN id SET DEFAULT nextval('public.contractor_payments_id_seq'::regclass);


--
-- Name: contractor_salary_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_salary_history ALTER COLUMN id SET DEFAULT nextval('public.contractor_salary_history_id_seq'::regclass);


--
-- Name: contractors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors ALTER COLUMN id SET DEFAULT nextval('public.contractors_id_seq'::regclass);


--
-- Name: daily_attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance ALTER COLUMN id SET DEFAULT nextval('public.daily_attendance_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: final_settlements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.final_settlements ALTER COLUMN id SET DEFAULT nextval('public.final_settlements_id_seq'::regclass);


--
-- Name: gate_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries ALTER COLUMN id SET DEFAULT nextval('public.gate_entries_id_seq'::regclass);


--
-- Name: gate_entries_pricing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries_pricing ALTER COLUMN id SET DEFAULT nextval('public.gate_entries_pricing_id_seq'::regclass);


--
-- Name: gate_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_returns ALTER COLUMN id SET DEFAULT nextval('public.gate_returns_id_seq'::regclass);


--
-- Name: leave_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications ALTER COLUMN id SET DEFAULT nextval('public.leave_applications_id_seq'::regclass);


--
-- Name: loan_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_applications ALTER COLUMN id SET DEFAULT nextval('public.loan_applications_id_seq'::regclass);


--
-- Name: loan_installments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_installments ALTER COLUMN id SET DEFAULT nextval('public.loan_installments_id_seq'::regclass);


--
-- Name: maintenance_issue_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issue_items ALTER COLUMN id SET DEFAULT nextval('public.maintenance_issue_items_id_seq'::regclass);


--
-- Name: maintenance_issues id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issues ALTER COLUMN id SET DEFAULT nextval('public.maintenance_issues_id_seq'::regclass);


--
-- Name: monthly_price_averages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_price_averages ALTER COLUMN id SET DEFAULT nextval('public.monthly_price_averages_id_seq'::regclass);


--
-- Name: monthly_salary_totals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_salary_totals ALTER COLUMN id SET DEFAULT nextval('public.monthly_salary_totals_id_seq'::regclass);


--
-- Name: pricing_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_entries ALTER COLUMN id SET DEFAULT nextval('public.pricing_entries_id_seq'::regclass);


--
-- Name: production id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production ALTER COLUMN id SET DEFAULT nextval('public.production_id_seq'::regclass);


--
-- Name: production_recipe id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_recipe ALTER COLUMN id SET DEFAULT nextval('public.production_recipe_id_seq'::regclass);


--
-- Name: production_reels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_reels ALTER COLUMN id SET DEFAULT nextval('public.production_reels_id_seq'::regclass);


--
-- Name: purchasers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchasers ALTER COLUMN id SET DEFAULT nextval('public.purchasers_id_seq'::regclass);


--
-- Name: salary_increments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_increments ALTER COLUMN id SET DEFAULT nextval('public.salary_increments_id_seq'::regclass);


--
-- Name: salary_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments ALTER COLUMN id SET DEFAULT nextval('public.salary_payments_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('public.stock_adjustments_id_seq'::regclass);


--
-- Name: store_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_entries ALTER COLUMN id SET DEFAULT nextval('public.store_entries_id_seq'::regclass);


--
-- Name: store_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_items ALTER COLUMN id SET DEFAULT nextval('public.store_items_id_seq'::regclass);


--
-- Name: store_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_returns ALTER COLUMN id SET DEFAULT nextval('public.store_returns_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: workers_salary_totals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workers_salary_totals ALTER COLUMN id SET DEFAULT nextval('public.workers_salary_totals_id_seq'::regclass);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: contractor_payments contractor_payments_contractor_id_payment_month_payment_yea_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_payments
    ADD CONSTRAINT contractor_payments_contractor_id_payment_month_payment_yea_key UNIQUE (contractor_id, payment_month, payment_year);


--
-- Name: contractor_payments contractor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_payments
    ADD CONSTRAINT contractor_payments_pkey PRIMARY KEY (id);


--
-- Name: contractor_salary_history contractor_salary_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_salary_history
    ADD CONSTRAINT contractor_salary_history_pkey PRIMARY KEY (id);


--
-- Name: contractors contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_pkey PRIMARY KEY (id);


--
-- Name: daily_attendance daily_attendance_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: daily_attendance daily_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_unique UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: final_settlements final_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.final_settlements
    ADD CONSTRAINT final_settlements_pkey PRIMARY KEY (id);


--
-- Name: gate_entries gate_entries_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries
    ADD CONSTRAINT gate_entries_grn_number_key UNIQUE (grn_number);


--
-- Name: gate_entries gate_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries
    ADD CONSTRAINT gate_entries_pkey PRIMARY KEY (id);


--
-- Name: gate_entries_pricing gate_entries_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries_pricing
    ADD CONSTRAINT gate_entries_pricing_pkey PRIMARY KEY (id);


--
-- Name: gate_returns gate_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_returns
    ADD CONSTRAINT gate_returns_pkey PRIMARY KEY (id);


--
-- Name: gate_returns gate_returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_returns
    ADD CONSTRAINT gate_returns_return_number_key UNIQUE (return_number);


--
-- Name: leave_applications leave_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT leave_applications_pkey PRIMARY KEY (id);


--
-- Name: loan_applications loan_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_applications
    ADD CONSTRAINT loan_applications_pkey PRIMARY KEY (id);


--
-- Name: loan_installments loan_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_installments
    ADD CONSTRAINT loan_installments_pkey PRIMARY KEY (id);


--
-- Name: maintenance_issue_items maintenance_issue_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issue_items
    ADD CONSTRAINT maintenance_issue_items_pkey PRIMARY KEY (id);


--
-- Name: maintenance_issues maintenance_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issues
    ADD CONSTRAINT maintenance_issues_pkey PRIMARY KEY (id);


--
-- Name: monthly_price_averages monthly_price_averages_item_type_month_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_price_averages
    ADD CONSTRAINT monthly_price_averages_item_type_month_year_key UNIQUE (item_type, month, year);


--
-- Name: monthly_price_averages monthly_price_averages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_price_averages
    ADD CONSTRAINT monthly_price_averages_pkey PRIMARY KEY (id);


--
-- Name: monthly_salary_totals monthly_salary_totals_month_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_salary_totals
    ADD CONSTRAINT monthly_salary_totals_month_year_key UNIQUE (month, year);


--
-- Name: monthly_salary_totals monthly_salary_totals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_salary_totals
    ADD CONSTRAINT monthly_salary_totals_pkey PRIMARY KEY (id);


--
-- Name: pricing_entries pricing_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricing_entries
    ADD CONSTRAINT pricing_entries_pkey PRIMARY KEY (id);


--
-- Name: production production_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production
    ADD CONSTRAINT production_pkey PRIMARY KEY (id);


--
-- Name: production_recipe production_recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_recipe
    ADD CONSTRAINT production_recipe_pkey PRIMARY KEY (id);


--
-- Name: production_reels production_reels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_reels
    ADD CONSTRAINT production_reels_pkey PRIMARY KEY (id);


--
-- Name: purchasers purchasers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchasers
    ADD CONSTRAINT purchasers_pkey PRIMARY KEY (id);


--
-- Name: salary_increments salary_increments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_increments
    ADD CONSTRAINT salary_increments_pkey PRIMARY KEY (id);


--
-- Name: salary_payments salary_payments_employee_id_payment_month_payment_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_employee_id_payment_month_payment_year_key UNIQUE (employee_id, payment_month, payment_year);


--
-- Name: salary_payments salary_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: store_entries store_entries_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_entries
    ADD CONSTRAINT store_entries_grn_number_key UNIQUE (grn_number);


--
-- Name: store_entries store_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_entries
    ADD CONSTRAINT store_entries_pkey PRIMARY KEY (id);


--
-- Name: store_items store_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_item_code_key UNIQUE (item_code);


--
-- Name: store_items store_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT store_items_pkey PRIMARY KEY (id);


--
-- Name: store_returns store_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_returns
    ADD CONSTRAINT store_returns_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: workers_salary_totals workers_salary_totals_month_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workers_salary_totals
    ADD CONSTRAINT workers_salary_totals_month_year_key UNIQUE (month, year);


--
-- Name: workers_salary_totals workers_salary_totals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workers_salary_totals
    ADD CONSTRAINT workers_salary_totals_pkey PRIMARY KEY (id);


--
-- Name: idx_daily_attendance_employee_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_attendance_employee_date ON public.daily_attendance USING btree (employee_id, attendance_date);


--
-- Name: idx_employees_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_department ON public.employees USING btree (department_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_gate_entries_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_date ON public.gate_entries USING btree (date_time);


--
-- Name: idx_gate_entries_pricing_grn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_pricing_grn ON public.gate_entries_pricing USING btree (grn_number);


--
-- Name: idx_gate_entries_pricing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_pricing_status ON public.gate_entries_pricing USING btree (status);


--
-- Name: idx_gate_entries_purchaser; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_purchaser ON public.gate_entries USING btree (purchaser_id);


--
-- Name: idx_gate_entries_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_supplier ON public.gate_entries USING btree (supplier_id);


--
-- Name: idx_gate_entries_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_type ON public.gate_entries USING btree (entry_type);


--
-- Name: idx_gate_returns_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_returns_date ON public.gate_returns USING btree (date_time);


--
-- Name: idx_gate_returns_original_grn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_returns_original_grn ON public.gate_returns USING btree (original_grn_number);


--
-- Name: idx_gate_returns_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_returns_type ON public.gate_returns USING btree (return_type);


--
-- Name: idx_loan_applications_employee_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loan_applications_employee_status ON public.loan_applications USING btree (employee_id, status);


--
-- Name: idx_pricing_entries_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_entries_reference ON public.pricing_entries USING btree (reference_id);


--
-- Name: idx_pricing_entries_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_entries_status ON public.pricing_entries USING btree (status);


--
-- Name: idx_pricing_entries_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pricing_entries_type ON public.pricing_entries USING btree (entry_type);


--
-- Name: idx_salary_increments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_increments_date ON public.salary_increments USING btree (effective_date);


--
-- Name: idx_salary_increments_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_increments_employee ON public.salary_increments USING btree (employee_id);


--
-- Name: idx_store_entries_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_entries_date ON public.store_entries USING btree (date_time);


--
-- Name: idx_store_entries_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_entries_item ON public.store_entries USING btree (item_id);


--
-- Name: idx_store_entries_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_entries_type ON public.store_entries USING btree (entry_type);


--
-- Name: idx_store_entries_vendor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_store_entries_vendor ON public.store_entries USING btree (vendor_id);


--
-- Name: idx_transactions_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_account ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (transaction_date);


--
-- Name: contractor_payments contractor_payments_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_payments
    ADD CONSTRAINT contractor_payments_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.contractors(id);


--
-- Name: contractor_salary_history contractor_salary_history_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractor_salary_history
    ADD CONSTRAINT contractor_salary_history_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.contractors(id);


--
-- Name: daily_attendance daily_attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_attendance
    ADD CONSTRAINT daily_attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: final_settlements final_settlements_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.final_settlements
    ADD CONSTRAINT final_settlements_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: gate_entries_pricing gate_entries_pricing_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries_pricing
    ADD CONSTRAINT gate_entries_pricing_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: gate_entries_pricing gate_entries_pricing_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries_pricing
    ADD CONSTRAINT gate_entries_pricing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id);


--
-- Name: gate_entries gate_entries_purchaser_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries
    ADD CONSTRAINT gate_entries_purchaser_id_fkey FOREIGN KEY (purchaser_id) REFERENCES public.accounts(id);


--
-- Name: gate_entries gate_entries_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries
    ADD CONSTRAINT gate_entries_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.accounts(id);


--
-- Name: gate_returns gate_returns_original_grn_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_returns
    ADD CONSTRAINT gate_returns_original_grn_number_fkey FOREIGN KEY (original_grn_number) REFERENCES public.gate_entries(grn_number);


--
-- Name: leave_applications leave_applications_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT leave_applications_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: loan_applications loan_applications_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_applications
    ADD CONSTRAINT loan_applications_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: loan_installments loan_installments_loan_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_installments
    ADD CONSTRAINT loan_installments_loan_application_id_fkey FOREIGN KEY (loan_application_id) REFERENCES public.loan_applications(id);


--
-- Name: maintenance_issue_items maintenance_issue_items_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issue_items
    ADD CONSTRAINT maintenance_issue_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.maintenance_issues(id);


--
-- Name: maintenance_issue_items maintenance_issue_items_item_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issue_items
    ADD CONSTRAINT maintenance_issue_items_item_code_fkey FOREIGN KEY (item_code) REFERENCES public.store_items(item_code);


--
-- Name: maintenance_issues maintenance_issues_department_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issues
    ADD CONSTRAINT maintenance_issues_department_code_fkey FOREIGN KEY (department_code) REFERENCES public.departments(code);


--
-- Name: production_recipe production_recipe_production_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_recipe
    ADD CONSTRAINT production_recipe_production_id_fkey FOREIGN KEY (production_id) REFERENCES public.production(id);


--
-- Name: production_reels production_reels_production_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_reels
    ADD CONSTRAINT production_reels_production_id_fkey FOREIGN KEY (production_id) REFERENCES public.production(id);


--
-- Name: salary_increments salary_increments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_increments
    ADD CONSTRAINT salary_increments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: salary_payments salary_payments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: store_entries store_entries_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_entries
    ADD CONSTRAINT store_entries_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id);


--
-- Name: store_entries store_entries_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_entries
    ADD CONSTRAINT store_entries_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.accounts(id);


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- PostgreSQL database dump complete
--

DROP TABLE IF EXISTS public.income_statement_adjustments;

CREATE TABLE public.income_statement_adjustments (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    adjustment_amount NUMERIC(15,2) NOT NULL,
    current_value NUMERIC(15,2) NOT NULL,
    new_value NUMERIC(15,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_category CHECK (
        category IN ('LABOR', 'MATERIALS', 'BOILER_FUEL', 'ENERGY', 'MAINTENANCE', 'PRODUCTION')
    ),
    CONSTRAINT unique_month_year_category UNIQUE (month, year, category)
);

