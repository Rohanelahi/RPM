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
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    bank_name character varying(100) NOT NULL,
    account_name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_accounts_id_seq OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_transactions (
    id integer NOT NULL,
    account_id integer,
    transaction_date timestamp without time zone NOT NULL,
    description text,
    reference character varying(100),
    type character varying(10),
    amount numeric(15,2) NOT NULL,
    balance numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT bank_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['CREDIT'::character varying, 'DEBIT'::character varying])::text[])))
);


ALTER TABLE public.bank_transactions OWNER TO postgres;

--
-- Name: bank_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_transactions_id_seq OWNER TO postgres;

--
-- Name: bank_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_transactions_id_seq OWNED BY public.bank_transactions.id;


--
-- Name: cash_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_tracking (
    id integer NOT NULL,
    cash_in_hand numeric(10,2) DEFAULT 0,
    cash_in_bank numeric(10,2) DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cash_tracking OWNER TO postgres;

--
-- Name: cash_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cash_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cash_tracking_id_seq OWNER TO postgres;

--
-- Name: cash_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cash_tracking_id_seq OWNED BY public.cash_tracking.id;


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
    hours_worked numeric(5,2) DEFAULT 0,
    standard_hours integer DEFAULT 8,
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
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(20),
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
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    expense_type character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    receiver_name character varying(100),
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


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
    processed_by_role character varying(20),
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
-- Name: income_statement_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.income_statement_adjustments (
    id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    category character varying(50) NOT NULL,
    adjustment_amount numeric(15,2) NOT NULL,
    current_value numeric(15,2) NOT NULL,
    new_value numeric(15,2) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_category CHECK (((category)::text = ANY ((ARRAY['LABOR'::character varying, 'MATERIALS'::character varying, 'BOILER_FUEL'::character varying, 'ENERGY'::character varying, 'MAINTENANCE'::character varying, 'PRODUCTION'::character varying])::text[])))
);


ALTER TABLE public.income_statement_adjustments OWNER TO postgres;

--
-- Name: income_statement_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.income_statement_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.income_statement_adjustments_id_seq OWNER TO postgres;

--
-- Name: income_statement_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.income_statement_adjustments_id_seq OWNED BY public.income_statement_adjustments.id;


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
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    payment_date timestamp without time zone NOT NULL,
    payment_mode character varying(20) NOT NULL,
    account_id integer,
    account_type character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_type character varying(20) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    receiver_name character varying(100),
    voucher_no character varying(20),
    is_tax_payment boolean DEFAULT false,
    created_by character varying(50),
    processed_by_role character varying(20)
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


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
    processed_by_role character varying(20),
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
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions ALTER COLUMN id SET DEFAULT nextval('public.bank_transactions_id_seq'::regclass);


--
-- Name: cash_tracking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_tracking ALTER COLUMN id SET DEFAULT nextval('public.cash_tracking_id_seq'::regclass);


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
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


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
-- Name: income_statement_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.income_statement_adjustments ALTER COLUMN id SET DEFAULT nextval('public.income_statement_adjustments_id_seq'::regclass);


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
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


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
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, account_name, account_type, contact_person, phone, email, address, opening_balance, current_balance, created_at) FROM stdin;
3	Mushtaq	VENDOR	\N	\N	\N	\N	0.00	339711.00	2025-01-23 23:31:06.585045
4	Murtaza	VENDOR	\N	\N	\N	\N	0.00	50669.00	2025-01-24 17:44:05.032903
2	ali	CUSTOMER	\N	\N	\N	\N	0.00	4408850.00	2025-01-23 23:30:52.467189
1	Bhatti	SUPPLIER	\N	\N	\N	\N	0.00	-7651455.00	2025-01-23 23:30:42.581391
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, bank_name, account_name, created_at) FROM stdin;
\.


--
-- Data for Name: bank_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_transactions (id, account_id, transaction_date, description, reference, type, amount, balance, created_at) FROM stdin;
\.


--
-- Data for Name: cash_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_tracking (id, cash_in_hand, cash_in_bank, last_updated) FROM stdin;
1	9700.00	0.00	2025-03-12 17:27:22.30644
\.


--
-- Data for Name: contractor_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractor_payments (id, contractor_id, payment_month, payment_year, amount, payment_date, status) FROM stdin;
\.


--
-- Data for Name: contractor_salary_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractor_salary_history (id, contractor_id, previous_salary, new_salary, effective_month, effective_year, created_at) FROM stdin;
1	2	550000.00	500000.00	2	2025	2025-02-10 17:42:47.449449
2	1	500000.00	550000.00	1	2025	2025-02-10 17:43:11.184162
3	1	550000.00	500000.00	1	2025	2025-02-10 17:46:33.319998
4	1	500000.00	500000.00	1	2025	2025-02-10 17:49:43.324204
5	1	550000.00	50000.00	2	2025	2025-02-10 21:18:38.934851
6	1	50000.00	500000.00	2	2025	2025-02-10 21:18:42.964294
7	1	50000.00	500000.00	2	2035	2025-02-10 21:19:22.146678
8	2	500000.00	500000.00	2	2035	2025-02-10 21:19:29.08488
9	1	50000.00	500000.00	2	2025	2025-02-10 21:19:52.454335
10	1	500000.00	500000.00	2	2025	2025-02-10 21:20:31.960757
11	2	500000.00	500000.00	2	2025	2025-02-10 21:20:34.852942
12	1	500000.00	500000.00	2	2025	2025-02-10 21:23:09.023634
13	2	500000.00	500000.00	2	2025	2025-02-10 21:34:07.368324
14	1	500000.00	500000.00	2	2025	2025-02-10 21:34:09.222052
15	1	500000.00	550000.00	12	2024	2025-02-10 21:35:02.750149
\.


--
-- Data for Name: contractors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractors (id, name, monthly_salary, status, created_at) FROM stdin;
2	Load/Unload Contractor	500000.00	ACTIVE	2025-02-06 22:01:08.341014
1	Rewinder Contractor	550000.00	ACTIVE	2025-02-06 22:01:08.341014
\.


--
-- Data for Name: daily_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_attendance (id, employee_id, attendance_date, status, in_time, out_time, overtime, remarks, created_at, salary_for_day, hours_worked, standard_hours) FROM stdin;
217	24ME2235	2025-03-06	Present	07:00:00	13:00:00	0.00		2025-03-10 17:14:25.181585	NaN	6.00	12
218	24MH5017	2025-03-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:25.181585	NaN	12.00	12
219	25ADM5120	2025-03-06	Present	09:00:00	17:00:00	0.00		2025-03-10 17:14:25.181585	NaN	8.00	12
220	25ADM9346	2025-03-06	Present	09:00:00	17:00:00	0.00		2025-03-10 17:14:25.181585	NaN	8.00	12
221	25LAB3085	2025-03-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:25.181585	NaN	12.00	12
222	25STR2402	2025-03-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:25.181585	NaN	12.00	12
235	24ME2235	2025-02-19	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:29.807934	NaN	12.00	12
236	24MH5017	2025-02-19	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:29.807934	NaN	12.00	12
237	25ADM5120	2025-02-19	Present	09:00:00	17:00:00	0.00		2025-03-10 17:28:29.807934	NaN	8.00	12
238	25ADM9346	2025-02-19	Present	09:00:00	17:00:00	0.00		2025-03-10 17:28:29.807934	NaN	8.00	12
239	25LAB3085	2025-02-19	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:29.807934	NaN	12.00	12
240	25STR2402	2025-02-19	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:29.807934	NaN	12.00	12
253	24ME2235	2025-02-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:34:18.531063	NaN	12.00	12
254	24MH5017	2025-02-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:34:18.531063	NaN	12.00	12
255	25ADM5120	2025-02-06	Present	09:00:00	12:00:00	0.00		2025-03-10 17:34:18.531063	NaN	3.00	12
256	25ADM9346	2025-02-06	Present	09:00:00	17:00:00	0.00		2025-03-10 17:34:18.531063	NaN	8.00	12
257	25LAB3085	2025-02-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:34:18.531063	NaN	12.00	12
258	25STR2402	2025-02-06	Present	07:00:00	19:00:00	0.00		2025-03-10 17:34:18.531063	NaN	12.00	12
271	24ME2235	2025-02-20	Absent	07:00:00	19:00:00	0.00		2025-03-10 17:54:07.366992	0.00	0.00	12
272	24MH5017	2025-02-20	Present	07:00:00	19:00:00	0.00		2025-03-10 17:54:07.366992	0.00	12.00	12
273	25ADM5120	2025-02-20	Absent	09:00:00	17:00:00	0.00		2025-03-10 17:54:07.366992	0.00	0.00	8
274	25ADM9346	2025-02-20	Present	09:00:00	17:00:00	0.00		2025-03-10 17:54:07.366992	0.00	8.00	8
275	25LAB3085	2025-02-20	Present	07:00:00	19:00:00	0.00		2025-03-10 17:54:07.366992	0.00	12.00	12
276	25STR2402	2025-02-20	Present	07:00:00	19:00:00	0.00		2025-03-10 17:54:07.366992	0.00	12.00	12
2	24MH5017	2024-12-22	Present	09:00:00	17:00:00	4.00		2024-12-22 04:10:54.403162	0.00	8.00	12
5	24MH5017	2024-12-11	Present	09:00:00	17:00:00	0.00		2024-12-22 04:45:47.046772	0.00	8.00	12
10	24ME2235	2024-12-23	Present	09:00:00	17:00:00	0.00		2024-12-24 01:33:34.22127	0.00	8.00	12
11	24MH5017	2024-12-23	Present	09:00:00	17:00:00	0.00		2024-12-24 01:33:34.22127	0.00	8.00	12
187	24ME2235	2025-03-05	Present	07:00:00	14:00:00	0.00		2025-03-10 17:10:01.528123	NaN	7.00	12
188	24MH5017	2025-03-05	Present	07:00:00	19:00:00	0.00		2025-03-10 17:10:01.528123	NaN	12.00	12
189	25ADM5120	2025-03-05	Present	09:00:00	17:00:00	0.00		2025-03-10 17:10:01.528123	NaN	8.00	12
190	25ADM9346	2025-03-05	Present	09:00:00	17:00:00	0.00		2025-03-10 17:10:01.528123	NaN	8.00	12
191	25LAB3085	2025-03-05	Present	07:00:00	19:00:00	0.00		2025-03-10 17:10:01.528123	NaN	12.00	12
192	25STR2402	2025-03-05	Present	07:00:00	11:00:00	0.00		2025-03-10 17:10:01.528123	NaN	4.00	12
241	24ME2235	2025-02-18	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:58.811888	NaN	12.00	12
242	24MH5017	2025-02-18	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:58.811888	NaN	12.00	12
243	25ADM5120	2025-02-18	Present	09:00:00	13:02:00	0.00		2025-03-10 17:28:58.811888	NaN	4.03	12
244	25ADM9346	2025-02-18	Present	09:00:00	17:00:00	0.00		2025-03-10 17:28:58.811888	NaN	8.00	12
245	25LAB3085	2025-02-18	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:58.811888	NaN	12.00	12
246	25STR2402	2025-02-18	Present	07:00:00	19:00:00	0.00		2025-03-10 17:28:58.811888	NaN	12.00	12
259	24ME2235	2025-02-26	Present	07:00:00	19:00:00	0.00		2025-03-10 17:38:09.005756	0.00	12.00	12
260	24MH5017	2025-02-26	Present	07:00:00	19:00:00	0.00		2025-03-10 17:38:09.005756	0.00	12.00	12
16	24ME2235	2024-12-09	Present	09:00:00	17:00:00	0.00		2024-12-25 02:25:51.425367	0.00	8.00	12
17	24MH5017	2024-12-09	Absent	09:00:00	17:00:00	0.00		2024-12-25 02:25:51.425367	0.00	0.00	12
22	24ME2235	2024-12-21	Present	09:00:00	17:00:00	0.00		2024-12-25 02:26:20.737734	0.00	8.00	12
23	24MH5017	2024-12-21	Absent	09:00:00	17:00:00	5.00		2024-12-25 02:26:20.737734	0.00	0.00	12
151	24ME2235	2025-03-08	Present	07:00:00	15:00:00	0.00		2025-03-10 16:57:01.037675	NaN	8.00	12
152	24MH5017	2025-03-08	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:01.037675	NaN	12.00	12
28	24ME2235	2024-12-28	Present	09:00:00	17:00:00	0.00		2024-12-28 02:01:06.224469	0.00	8.00	12
29	24MH5017	2024-12-28	Present	09:00:00	17:00:00	0.00		2024-12-28 02:01:06.224469	0.00	8.00	12
153	25ADM5120	2025-03-08	Present	09:00:00	17:00:00	0.00		2025-03-10 16:57:01.037675	NaN	8.00	8
154	25ADM9346	2025-03-08	Present	09:00:00	17:00:00	0.00		2025-03-10 16:57:01.037675	NaN	8.00	8
155	25LAB3085	2025-03-08	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:01.037675	NaN	12.00	12
156	25STR2402	2025-03-08	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:01.037675	NaN	12.00	12
35	24ME2235	2024-12-10	Present	09:00:00	17:00:00	0.00		2024-12-28 02:02:42.625679	0.00	8.00	12
36	24MH5017	2024-12-10	Present	09:00:00	17:00:00	0.00		2024-12-28 02:02:42.625679	0.00	8.00	12
42	24ME2235	2025-01-29	Present	09:00:00	17:00:00	0.00		2025-02-02 22:07:52.040624	0.00	8.00	12
43	24MH5017	2025-01-29	Present	09:00:00	17:00:00	0.00		2025-02-02 22:07:52.040624	0.00	8.00	12
56	24ME2235	2025-02-04	Present	07:00:00	19:00:00	0.00		2025-02-04 17:39:34.460141	0.00	12.00	12
57	24MH5017	2025-02-04	Present	07:00:00	19:00:00	0.00		2025-02-04 17:39:34.460141	0.00	12.00	12
63	24ME2235	2025-02-01	Present	07:00:00	19:00:00	0.00		2025-02-04 17:39:57.758914	0.00	12.00	12
64	24MH5017	2025-02-01	Present	07:00:00	19:00:00	0.00		2025-02-04 17:39:57.758914	0.00	12.00	12
70	24ME2235	2025-02-02	Present	09:00:00	17:00:00	0.00		2025-02-04 17:40:56.53517	0.00	8.00	12
71	24MH5017	2025-02-02	Present	09:00:00	17:00:00	0.00		2025-02-04 17:40:56.53517	0.00	8.00	12
84	24ME2235	2025-02-03	Present	07:00:00	19:00:00	0.00		2025-02-04 17:47:31.104433	NaN	12.00	12
85	24MH5017	2025-02-03	Present	07:00:00	19:00:00	0.00		2025-02-04 17:47:31.104433	NaN	12.00	12
91	24ME2235	2025-01-16	Present	07:00:00	19:00:00	0.00		2025-02-04 17:48:13.022693	NaN	12.00	12
92	24MH5017	2025-01-16	Present	07:00:00	19:00:00	0.00		2025-02-04 17:48:13.022693	NaN	12.00	12
98	24ME2235	2025-01-14	Present	07:00:00	19:00:00	0.00		2025-02-04 17:48:55.346234	NaN	12.00	12
99	24MH5017	2025-01-14	Present	07:00:00	19:00:00	0.00		2025-02-04 17:48:55.346234	NaN	12.00	12
105	24ME2235	2025-01-02	Present	07:00:00	19:00:00	0.00		2025-02-04 17:51:04.252369	NaN	12.00	12
106	24MH5017	2025-01-02	Present	07:00:00	19:00:00	0.00		2025-02-04 17:51:04.252369	NaN	12.00	12
157	24ME2235	2025-03-04	Present	07:00:00	14:02:00	0.00		2025-03-10 16:57:37.49564	NaN	7.03	12
158	24MH5017	2025-03-04	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:37.49564	NaN	12.00	12
159	25ADM5120	2025-03-04	Present	09:00:00	17:00:00	0.00		2025-03-10 16:57:37.49564	NaN	8.00	8
160	25ADM9346	2025-03-04	Present	09:00:00	17:00:00	0.00		2025-03-10 16:57:37.49564	NaN	8.00	8
261	25ADM5120	2025-02-26	Present	09:00:00	12:00:00	0.00		2025-03-10 17:38:09.005756	0.00	3.00	8
262	25ADM9346	2025-02-26	Present	09:00:00	17:00:00	0.00		2025-03-10 17:38:09.005756	0.00	8.00	8
263	25LAB3085	2025-02-26	Present	07:00:00	19:00:00	0.00		2025-03-10 17:38:09.005756	0.00	12.00	12
264	25STR2402	2025-02-26	Present	07:00:00	19:00:00	0.00		2025-03-10 17:38:09.005756	0.00	12.00	12
161	25LAB3085	2025-03-04	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:37.49564	NaN	12.00	12
162	25STR2402	2025-03-04	Present	07:00:00	19:00:00	0.00		2025-03-10 16:57:37.49564	NaN	12.00	12
169	24ME2235	2025-03-02	Half Day	07:00:00	19:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
170	24MH5017	2025-03-02	Present	07:00:00	19:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
171	25ADM5120	2025-03-02	Present	09:00:00	17:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
172	25ADM9346	2025-03-02	Present	09:00:00	17:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
173	25LAB3085	2025-03-02	Present	07:00:00	19:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
174	25STR2402	2025-03-02	Present	07:00:00	19:00:00	0.00		2025-03-10 17:05:13.765801	NaN	\N	12
211	24ME2235	2025-03-07	Present	07:00:00	15:00:00	0.00		2025-03-10 17:14:01.756776	NaN	8.00	12
212	24MH5017	2025-03-07	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:01.756776	NaN	12.00	12
213	25ADM5120	2025-03-07	Present	09:00:00	17:00:00	0.00		2025-03-10 17:14:01.756776	NaN	8.00	12
214	25ADM9346	2025-03-07	Present	09:00:00	17:00:00	0.00		2025-03-10 17:14:01.756776	NaN	8.00	12
215	25LAB3085	2025-03-07	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:01.756776	NaN	12.00	12
216	25STR2402	2025-03-07	Present	07:00:00	19:00:00	0.00		2025-03-10 17:14:01.756776	NaN	12.00	12
229	24ME2235	2025-03-10	Present	07:00:00	13:00:00	0.00		2025-03-10 17:27:58.855781	NaN	6.00	12
230	24MH5017	2025-03-10	Present	07:00:00	19:00:00	0.00		2025-03-10 17:27:58.855781	NaN	12.00	12
231	25ADM5120	2025-03-10	Present	09:00:00	17:00:00	0.00		2025-03-10 17:27:58.855781	NaN	8.00	12
232	25ADM9346	2025-03-10	Present	09:00:00	17:00:00	0.00		2025-03-10 17:27:58.855781	NaN	8.00	12
233	25LAB3085	2025-03-10	Present	07:00:00	19:00:00	0.00		2025-03-10 17:27:58.855781	NaN	12.00	12
234	25STR2402	2025-03-10	Present	07:00:00	19:00:00	0.00		2025-03-10 17:27:58.855781	NaN	12.00	12
247	24ME2235	2025-02-17	Present	07:00:00	19:00:00	0.00		2025-03-10 17:29:53.332456	NaN	12.00	12
248	24MH5017	2025-02-17	Present	07:00:00	19:00:00	0.00		2025-03-10 17:29:53.332456	NaN	12.00	12
249	25ADM5120	2025-02-17	Present	09:00:00	11:00:00	0.00		2025-03-10 17:29:53.332456	NaN	2.00	12
250	25ADM9346	2025-02-17	Present	09:00:00	17:00:00	0.00		2025-03-10 17:29:53.332456	NaN	8.00	12
251	25LAB3085	2025-02-17	Present	07:00:00	19:00:00	0.00		2025-03-10 17:29:53.332456	NaN	12.00	12
252	25STR2402	2025-02-17	Present	07:00:00	19:00:00	0.00		2025-03-10 17:29:53.332456	NaN	12.00	12
265	24ME2235	2025-02-22	Present	07:00:00	19:00:00	0.00		2025-03-10 17:50:55.677227	0.00	12.00	12
266	24MH5017	2025-02-22	Present	07:00:00	19:00:00	0.00		2025-03-10 17:50:55.677227	0.00	12.00	12
267	25ADM5120	2025-02-22	Present	09:00:00	17:00:00	0.00		2025-03-10 17:50:55.677227	0.00	8.00	8
268	25ADM9346	2025-02-22	Present	09:00:00	17:00:00	0.00		2025-03-10 17:50:55.677227	0.00	8.00	8
269	25LAB3085	2025-02-22	Present	07:00:00	19:00:00	0.00		2025-03-10 17:50:55.677227	0.00	12.00	12
270	25STR2402	2025-02-22	Present	07:00:00	19:00:00	0.00		2025-03-10 17:50:55.677227	0.00	12.00	12
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, code, created_at) FROM stdin;
6	Mechanical	ME	2024-12-22 04:00:35.033942
7	Electrical	EL	2024-12-22 04:00:35.033942
8	Pulp	PL	2024-12-22 04:00:35.033942
9	Machine Hall	MH	2024-12-22 04:00:35.033942
14	Civil	CE	2024-12-24 00:27:37.888803
16	Admin	ADM	2025-03-07 15:58:19.358943
17	Gate	GTE	2025-03-07 15:58:19.358943
18	Lab	LAB	2025-03-07 15:59:07.902843
19	Store	STR	2025-03-07 16:54:00.478195
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, first_name, last_name, department_id, designation, joining_date, salary, phone, status, created_at, termination_date, separation_type, due_salary, emergency_contact_name, emergency_contact_phone) FROM stdin;
25LAB3085	Akram	Udaas	18	Lab Incharge	2025-03-07	25000.00	0321456789	ACTIVE	2025-03-07 16:00:45.679202	\N	\N	0.00	Udaas	03218976543
24ME2235	Rohan	Elahi	6	worker	2024-12-22	60000.00	03009697484	ACTIVE	2024-12-22 04:48:51.711084	\N	\N	0.00	\N	\N
25ADM9346	Murtaza	Bhatti	16	GM Admin	2025-03-07	50000.00	03034222155	ACTIVE	2025-03-07 16:52:36.10719	\N	\N	0.00	Bhatti	12345678912
25STR2402	Fida	Hussain	19	Store Incharge	2025-03-07	30000.00	03094654346	ACTIVE	2025-03-07 16:54:51.636903	\N	\N	0.00	Hussain	12345678911
24MH5017	Hasan	SH	9	worker	2024-12-22	50000.00	0300124567	ACTIVE	2024-12-22 04:06:33.962732	\N	\N	0.00	\N	\N
25ADM5120	Adeel	Sb	16	Accounts Manager	2025-03-07	50000.00	03018400940	ACTIVE	2025-03-07 16:53:35.438564	\N	\N	0.00	BB	12345678911
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, date, expense_type, amount, receiver_name, remarks, created_at) FROM stdin;
1	2025-03-05 18:53:28.238	PETROL	100.00	Fida		2025-03-05 18:53:41.968479
2	2025-03-05 19:05:59.959	MESS	150.00	Fida		2025-03-05 19:06:25.416835
3	2025-03-05 19:14:58.413	PETROL	100.00	Fida		2025-03-05 19:15:09.812635
\.


--
-- Data for Name: final_settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.final_settlements (id, employee_id, separation_type, last_working_date, due_salary, loan_deductions, advance_deductions, net_settlement, created_at) FROM stdin;
\.


--
-- Data for Name: gate_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_entries (id, grn_number, entry_type, supplier_id, purchaser_id, vehicle_type, vehicle_number, driver_name, item_type, paper_type, quantity, unit, date_time, remarks, created_at, has_return) FROM stdin;
1	GRN-BRM-250123-390	PURCHASE_IN	1	\N	\N	123	Fida	Raw Material	\N	12345.00	KG	2025-01-23 18:31:26.846	Supplier Qty: 12345, Received Qty: 12345, 	2025-01-23 23:31:45.938829	f
2	SO-AWP-250123-002	SALE_OUT	\N	2	10 Wheeler	123	ali	\N	White Paper	12345.00	KG	2025-01-23 18:34:03.676		2025-01-23 23:34:19.322865	f
3	GRN-BSP-250124-671	PURCHASE_IN	1	\N	\N	123	rohan	Spare Parts	\N	15.00	Piece	2025-01-24 13:55:35.876	Supplier Qty: 15, Received Qty: 15, 	2025-01-24 18:55:53.536118	f
4	GRN-BPM-250125-712	PURCHASE_IN	1	\N	\N	123	ali	Packaging Material	\N	12345.00	KG	2025-01-24 19:45:46.094	Supplier Qty: 12345, Received Qty: 12345, 	2025-01-25 00:46:08.695292	f
5	SO-AN-250125-669	SALE_OUT	\N	2	6 Wheeler	123	ali	\N	Newspaper	12345.00	KG	2025-01-24 19:46:12.436		2025-01-25 00:46:27.728721	t
6	GRN-BP-250126-829	PURCHASE_IN	1	\N	\N	123	fida	Petti	\N	10570.00	KG	2025-01-26 16:53:04.435	Supplier Qty: 10570, Received Qty: 10570, 	2025-01-26 22:03:34.673619	f
7	GRN-BMM-250126-347	PURCHASE_IN	1	\N	\N	123	fida	Mix Maal	\N	1000.00	KG	2025-01-26 17:03:35.829	Supplier Qty: 1000, Received Qty: 1000, 	2025-01-26 22:15:17.674999	f
8	GRN-BP-250126-135	PURCHASE_IN	1	\N	\N	123	ali	Petti	\N	12345.00	KG	2025-01-26 17:46:32.943	Supplier Qty: 12345, Received Qty: 12345, 	2025-01-26 22:46:51.367947	f
9	GRN-BMM-250126-605	PURCHASE_IN	1	\N	\N	123	Amin	Mix Maal	\N	1500.00	KG	2025-01-26 17:46:52.323	Supplier Qty: 1500, Received Qty: 1500, 	2025-01-26 22:57:30.644934	f
15	GRN-BBF-250202-332	PURCHASE_IN	1	\N	\N	123	Arif	Boiler Fuel (Toori)	\N	10000.00	KG	2025-02-02 16:53:08.814	Supplier Qty: 10000, Received Qty: 10000, 	2025-02-02 21:53:26.634083	f
16	GRN-BP-250202-413	PURCHASE_IN	1	\N	\N	456	Bhatti	Petti	\N	15000.00	KG	2025-02-02 17:18:55.951	Supplier Qty: 15000, Received Qty: 15000, 	2025-02-02 22:19:13.955967	f
17	GRN-BP-250203-849	PURCHASE_IN	1	\N	\N	123	ali	Petti	\N	9000.00	KG	2025-02-03 12:49:59.014	Supplier Qty: 10000, Received Qty: 9000, 	2025-02-03 17:50:40.823246	f
19	GRN-BP-250220-370	PURCHASE_IN	1	\N	\N	134	ali	Petti	\N	1000.00	KG	2025-02-20 10:18:57.803	Supplier Qty: 1000, Received Qty: 1000, 	2025-02-20 15:19:16.353309	f
20	GRN-BP-250302-515	PURCHASE_IN	1	\N	\N	123	Elahi	Petti	\N	9580.00	KG	2025-03-02 10:00:59.558	Supplier Qty: 10000, Received Qty: 9580, 	2025-03-02 15:15:13.229647	f
21	GRN-BP-250307-306	PURCHASE_IN	1	\N	\N	123	Ali	Petti	\N	10000.00	KG	2025-03-07 12:03:54	Supplier Qty: 10000, Received Qty: 10000, 	2025-03-07 17:05:30.960145	f
18	SO-AS-250212-380	SALE_OUT	\N	2	10 Wheeler	123	ali	\N	SUPER	1000.00	KG	2025-02-11 20:10:17.246		2025-02-12 01:12:08.312826	t
22	SO-AS-250309-094	SALE_OUT	\N	2	Mazda	123	ali	\N	SUPER	7000.00	KG	2025-03-09 12:01:16.318		2025-03-09 17:01:36.485359	f
\.


--
-- Data for Name: gate_entries_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_entries_pricing (id, entry_type, grn_number, account_id, item_id, quantity, price_per_unit, total_amount, status, processed_at, created_at, original_grn_number, cut_weight, final_quantity, processed_by_role) FROM stdin;
1	PURCHASE	GRN-BRM-250123-390	1	\N	12345.00	120.00	1481400.00	PROCESSED	2025-01-23 23:31:57.397223	2025-01-23 23:31:45.938829	\N	0.00	\N	\N
2	SALE	SO-AWP-250123-002	2	\N	12345.00	150.00	1851750.00	PROCESSED	2025-01-23 23:34:28.381972	2025-01-23 23:34:19.322865	\N	0.00	\N	\N
3	PURCHASE	GRN-BSP-250124-671	1	\N	15.00	1.00	15.00	PROCESSED	2025-01-25 00:49:01.877546	2025-01-24 18:55:53.536118	\N	0.00	\N	\N
8	PURCHASE_RETURN	RET-250125-159	1	\N	15.00	1000.00	15000.00	PROCESSED	2025-01-25 01:04:06.566058	2025-01-25 00:48:50.640373	GRN-BSP-250124-671	0.00	\N	\N
7	SALE_RETURN	SRET-250125-539	2	\N	12345.00	100.00	1234500.00	PROCESSED	2025-01-25 01:04:30.085701	2025-01-25 00:48:33.570658	SO-AN-250125-669	0.00	\N	\N
5	PURCHASE	GRN-BPM-250125-712	1	\N	12345.00	100.00	1234500.00	PROCESSED	2025-01-25 01:24:40.639618	2025-01-25 00:46:08.695292	\N	0.00	\N	\N
6	SALE	SO-AN-250125-669	2	\N	12345.00	100.00	1234500.00	PROCESSED	2025-01-25 01:30:07.781391	2025-01-25 00:46:27.728721	\N	0.00	\N	\N
9	PURCHASE	GRN-BP-250126-829	1	\N	10570.00	60.00	604200.00	PROCESSED	2025-01-26 22:03:53.550814	2025-01-26 22:03:34.673619	\N	500.00	10070.00	\N
10	PURCHASE	GRN-BMM-250126-347	1	\N	1000.00	50.00	49000.00	PROCESSED	2025-01-26 22:15:52.158323	2025-01-26 22:15:17.674999	\N	20.00	980.00	\N
11	PURCHASE	GRN-BP-250126-135	1	\N	12345.00	100.00	1234500.00	PROCESSED	2025-01-26 22:47:00.362757	2025-01-26 22:46:51.367947	\N	0.00	12345.00	\N
12	PURCHASE	GRN-BMM-250126-605	1	\N	1500.00	10.00	15000.00	PROCESSED	2025-01-26 22:57:38.679125	2025-01-26 22:57:30.644934	\N	0.00	1500.00	\N
13	PURCHASE	GRN-BBF-250202-332	1	\N	10000.00	25.00	250000.00	PROCESSED	2025-02-02 21:53:49.879563	2025-02-02 21:53:26.634083	\N	0.00	10000.00	\N
14	PURCHASE	GRN-BP-250202-413	1	\N	15000.00	100.00	1500000.00	PROCESSED	2025-02-02 22:19:22.090744	2025-02-02 22:19:13.955967	\N	0.00	15000.00	\N
15	PURCHASE	GRN-BP-250203-849	1	\N	9000.00	40.00	352000.00	PROCESSED	2025-02-03 17:54:40.179909	2025-02-03 17:50:40.823246	\N	200.00	8800.00	\N
16	PURCHASE_RETURN	RET-250203-255	1	\N	15000.00	0.00	0.00	PENDING	\N	2025-02-03 18:16:56.829547	GRN-BP-250202-413	0.00	\N	\N
17	SALE	SO-AS-250212-380	2	\N	1000.00	98.00	98000.00	PROCESSED	2025-02-12 01:12:21.9291	2025-02-12 01:12:08.312826	\N	0.00	1000.00	\N
18	PURCHASE	GRN-BP-250220-370	1	\N	1000.00	45.00	37845.00	PROCESSED	2025-02-20 15:20:56.17169	2025-02-20 15:19:16.353309	\N	159.00	841.00	\N
19	PURCHASE	GRN-BP-250302-515	1	\N	9580.00	45.00	426600.00	PROCESSED	2025-03-02 15:15:30.537938	2025-03-02 15:15:13.229647	\N	100.00	9480.00	TAX
20	PURCHASE	GRN-BP-250307-306	1	\N	10000.00	50.00	487500.00	PROCESSED	2025-03-09 16:04:32.50345	2025-03-07 17:05:30.960145	\N	250.00	9750.00	ACCOUNTS
21	SALE_RETURN	SRET-250309-581	2	\N	1000.00	0.00	0.00	PENDING	\N	2025-03-09 16:13:33.822838	SO-AS-250212-380	0.00	\N	\N
22	SALE	SO-AS-250309-094	2	\N	7000.00	0.00	0.00	PENDING	\N	2025-03-09 17:01:36.485359	\N	0.00	\N	\N
\.


--
-- Data for Name: gate_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_returns (id, return_number, original_grn_number, return_type, return_quantity, return_reason, vehicle_type, vehicle_number, driver_name, date_time, remarks, created_at) FROM stdin;
3	SRET-250125-539	SO-AN-250125-669	SALE_RETURN	12345.00	Excess Quantity	6 Wheeler	123	ali	2025-01-24 19:48:24.6	Return against Sale GRN: SO-AN-250125-669	2025-01-25 00:48:33.570658
4	RET-250125-159	GRN-BSP-250124-671	PURCHASE_RETURN	15.00	Wrong Delivery		123	rohan	2025-01-24 19:48:41.243		2025-01-25 00:48:50.640373
5	RET-250203-255	GRN-BP-250202-413	PURCHASE_RETURN	15000.00	Quality Issue		456	Bhatti	2025-02-03 13:16:26.348		2025-02-03 18:16:56.829547
6	SRET-250309-581	SO-AS-250212-380	SALE_RETURN	1000.00	Quality Issue	10 Wheeler	123	ali	2025-03-09 11:13:24.622	Return against Sale GRN: SO-AS-250212-380	2025-03-09 16:13:33.822838
\.


--
-- Data for Name: income_statement_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.income_statement_adjustments (id, month, year, category, adjustment_amount, current_value, new_value, remarks, created_at) FROM stdin;
1	1	2025	ENERGY	11000.00	0.00	11000.00		2025-02-13 17:02:58.823903
2	1	2025	MATERIALS	-673560.00	673760.00	200.00		2025-02-15 14:28:18.984469
3	1	2025	BOILER_FUEL	11000.00	0.00	11000.00		2025-02-15 14:35:22.109573
4	12	2024	ENERGY	100000.00	0.00	100000.00		2025-02-15 17:08:28.429664
7	12	2024	BOILER_FUEL	1000.00	0.00	1000.00		2025-02-15 17:11:21.30117
11	1	2025	MATERIALS	-673680.00	673760.00	80.00	DABBI	2025-02-18 11:05:53.228851
12	1	2025	MATERIALS	-656760.00	673760.00	17000.00	Petti	2025-02-18 11:06:45.564681
13	1	2025	BOILER_FUEL	8.00	10992.00	11000.00	Boiler Fuel (Toori)	2025-02-18 11:08:39.705439
16	1	2025	BOILER_FUEL	1008.00	10992.00	12000.00	Boiler Fuel (Toori)	2025-02-20 01:51:03.248504
17	1	2025	MATERIALS	-658760.00	673760.00	15000.00	Petti	2025-02-20 01:59:47.654057
18	1	2025	MATERIALS	-653760.00	673760.00	20000.00	Petti	2025-02-20 02:05:10.204141
\.


--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_applications (id, employee_id, start_date, end_date, reason, leave_with_pay, status, approved_by, created_at) FROM stdin;
1	24MH5017	2024-12-21	2024-12-23	wedding	t	PENDING	\N	2024-12-22 04:15:01.036842
2	24ME2235	2025-03-06	2025-03-06	Shaadi	f	PENDING	\N	2025-03-07 16:05:45.021953
\.


--
-- Data for Name: loan_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_applications (id, employee_id, loan_type, amount, installments, start_month, end_month, monthly_installment, status, approved_by, created_at) FROM stdin;
1	24MH5017	loan	1000.00	2	2024-12-21	2025-01-21	500.00	PENDING	\N	2024-12-22 04:14:19.145248
2	24MH5017	loan	10000.00	5	2024-12-22	2025-04-22	2000.00	APPROVED	\N	2024-12-22 04:32:44.841362
3	24MH5017	advance	5000.00	2	2024-12-24	2025-01-24	2500.00	APPROVED	\N	2024-12-24 01:01:03.017068
4	24ME2235	loan	10000.00	3	2025-03-07	2025-05-07	3333.33	APPROVED	\N	2025-03-07 16:12:01.079029
\.


--
-- Data for Name: loan_installments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_installments (id, loan_application_id, installment_date, amount, paid, paid_date, created_at) FROM stdin;
1	1	2024-12-22	500.00	f	\N	2024-12-22 04:14:19.145248
2	1	2025-01-22	500.00	f	\N	2024-12-22 04:14:19.145248
3	2	2024-12-22	2000.00	f	\N	2024-12-22 04:32:44.841362
4	2	2025-01-22	2000.00	f	\N	2024-12-22 04:32:44.841362
5	2	2025-02-22	2000.00	f	\N	2024-12-22 04:32:44.841362
6	2	2025-03-22	2000.00	f	\N	2024-12-22 04:32:44.841362
7	2	2025-04-22	2000.00	f	\N	2024-12-22 04:32:44.841362
8	3	2024-12-24	2500.00	f	\N	2024-12-24 01:01:03.017068
9	3	2025-01-24	2500.00	f	\N	2024-12-24 01:01:03.017068
10	4	2025-03-07	3333.33	f	\N	2025-03-07 16:12:01.079029
11	4	2025-04-07	3333.33	f	\N	2025-03-07 16:12:01.079029
12	4	2025-05-07	3333.33	f	\N	2025-03-07 16:12:01.079029
\.


--
-- Data for Name: maintenance_issue_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_issue_items (id, issue_id, item_code, quantity, unit_price, created_at) FROM stdin;
5	5	AF001	2	1000.00	2025-01-24 01:05:59.07582
28	18	AF001	4	1000.00	2025-01-24 01:33:49.141234
29	18	BP001	4	123.00	2025-01-24 01:33:49.141234
30	19	AF001	10	1000.00	2025-01-24 17:57:48.727744
31	19	BP001	10	1000.00	2025-01-24 17:57:48.727744
32	20	AF001	50	1000.00	2025-01-24 18:03:30.680259
33	21	B795	10	100.00	2025-02-02 22:17:22.480498
34	21	BP001	10	12.00	2025-02-02 22:17:22.480498
\.


--
-- Data for Name: maintenance_issues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_issues (id, department_code, issue_date, created_at) FROM stdin;
18	EL	2025-01-23	2025-01-24 01:33:49.141234
19	EL	2025-01-24	2025-01-24 17:57:48.727744
20	CE	2025-01-24	2025-01-24 18:03:30.680259
5	\N	2025-01-23	2025-01-24 01:05:59.07582
21	\N	2025-02-02	2025-02-02 22:17:22.480498
\.


--
-- Data for Name: monthly_price_averages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_price_averages (id, item_type, month, year, average_price, created_at) FROM stdin;
\.


--
-- Data for Name: monthly_salary_totals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_salary_totals (id, month, year, total_amount, payment_date, payment_status) FROM stdin;
1	12	2024	58726.00	2025-02-04	PAID
2	1	2025	48081.00	2025-02-04	PAID
3	2	2025	0.00	2025-03-10	PAID
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, payment_date, payment_mode, account_id, account_type, amount, payment_type, remarks, created_at, receiver_name, voucher_no, is_tax_payment, created_by, processed_by_role) FROM stdin;
1	2025-03-04 14:48:25.333	CASH	2	CUSTOMER	10000.00	ISSUED		2025-03-04 14:50:26.333862	\N	\N	f	\N	\N
2	2025-03-04 15:00:56.626	CASH	2	CUSTOMER	10000.00	RECEIVED		2025-03-04 15:01:23.300171	Ali	\N	f	\N	\N
3	2025-03-04 15:24:38.684	ONLINE	1	SUPPLIER	25000.00	ISSUED		2025-03-04 15:24:55.392457	ali	\N	f	\N	\N
7	2025-03-04 16:50:24.807	CASH	2	CUSTOMER	100.00	ISSUED		2025-03-04 16:50:39.563288	ali	PV20250001	f	\N	\N
8	2025-03-04 16:57:50.729	ONLINE	1	SUPPLIER	1000.00	ISSUED		2025-03-04 16:58:08.119286	ali	PV202520250002	f	\N	\N
9	2025-03-05 14:48:26.782	CASH	2	CUSTOMER	1000.00	RECEIVED		2025-03-05 14:48:45.835606	Fida	RV20250001	f	\N	\N
10	2025-03-05 15:05:19.209	CASH	2	CUSTOMER	1000.00	ISSUED		2025-03-05 15:05:34.921299	ali	PV20250003	f	\N	\N
46	2025-03-05 15:27:35.796	CASH	1	SUPPLIER	123.00	RECEIVED		2025-03-05 15:27:48.478672	ali	RV20250002	f	\N	\N
47	2025-03-05 15:27:55.141	CHEQUE	1	SUPPLIER	134.00	ISSUED		2025-03-05 15:28:10.450904	abid	PV20250003	f	\N	\N
48	2025-03-05 15:30:07.22	CASH	1	SUPPLIER	12345.00	ISSUED		2025-03-05 15:30:22.801026	asiuf	PV20250003	f	\N	\N
49	2025-03-05 15:39:15.869	CASH	2	CUSTOMER	100.00	RECEIVED		2025-03-05 15:39:33.615301	ali	RV20250001	f	\N	\N
50	2025-03-05 15:41:35.519	CASH	2	CUSTOMER	100.00	ISSUED		2025-03-05 15:42:20.476142	ali	PV20250001	f	\N	\N
51	2025-03-05 15:42:23.753	CASH	1	SUPPLIER	123.00	RECEIVED		2025-03-05 15:42:36.37816	ali	RV20250001	f	\N	\N
52	2025-03-05 15:43:53.485	ONLINE	1	SUPPLIER	157.00	ISSUED		2025-03-05 15:44:07.85521	ali	PV20250002	f	\N	\N
53	2025-03-05 15:44:23.017	ONLINE	4	VENDOR	190.00	RECEIVED		2025-03-05 15:44:34.970951	ali	RV20250002	f	\N	\N
54	2025-03-05 15:45:31.497	CASH	1	SUPPLIER	170.00	ISSUED		2025-03-05 15:45:45.314194	hamza	PV20250003	f	\N	\N
55	2025-03-05 19:13:02.972	CASH	2	CUSTOMER	10000.00	RECEIVED		2025-03-05 19:13:17.327152	Adeel	RV20250003	f	\N	\N
56	2025-03-05 19:14:34.482	CASH	1	SUPPLIER	100.00	ISSUED		2025-03-05 19:14:49.98499	fida	PV20250004	f	\N	\N
57	2025-03-05 19:40:23.935	CASH	2	CUSTOMER	100.00	ISSUED		2025-03-05 19:40:36.836145	Adeel	PV20250005	f	\N	TAX
58	2025-03-05 19:40:58.636	CASH	2	CUSTOMER	100.00	RECEIVED		2025-03-05 19:41:12.111917	saman	RV20250004	f	\N	ACCOUNTS
59	2025-03-12 17:26:57.444	CASH	1	SUPPLIER	100.00	ISSUED		2025-03-12 17:27:22.30644	Ali	PV20250006	f	\N	ACCOUNTS
\.


--
-- Data for Name: pricing_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_entries (id, entry_type, reference_id, status, quantity, unit, price_per_unit, total_amount, processed_at, created_at, return_grn, item_name) FROM stdin;
1	STORE_PURCHASE	1	PROCESSED	123.00	Piece	1000.00	123000.00	2025-01-23 23:35:28.628296	2025-01-23 23:35:20.398852	\N	\N
2	STORE_PURCHASE	2	PROCESSED	12.00	Piece	123.00	1476.00	2025-01-23 23:48:59.502048	2025-01-23 23:48:52.897391	\N	\N
3	STORE_PURCHASE	31	PROCESSED	100.00	Set	1000.00	100000.00	2025-01-24 17:48:22.250276	2025-01-24 17:44:55.451774	\N	\N
6	PURCHASE_RETURN	6	PENDING	5.00	Piece	1000.00	\N	\N	2025-01-24 18:48:05.262116	\N	\N
7	PURCHASE_RETURN	7	PENDING	10.00	Set	1000.00	\N	\N	2025-01-24 18:50:20.740251	\N	\N
4	STORE_PURCHASE	32	PROCESSED	150.00	Piece	500.00	75000.00	2025-01-24 18:53:08.392179	2025-01-24 17:49:05.469812	\N	\N
8	PURCHASE_RETURN	8	PENDING	10.00	Piece	500.00	\N	\N	2025-01-24 19:00:20.078182	\N	\N
9	PURCHASE_RETURN	9	PENDING	10.00	Piece	500.00	\N	\N	2025-01-24 21:25:52.599154	\N	\N
11	STORE_RETURN	11	PROCESSED	10.00	Set	100.00	\N	2025-01-24 21:33:13.458376	2025-01-24 21:29:01.120557	\N	\N
12	STORE_RETURN	13	PROCESSED	10.00	Set	100.00	\N	2025-01-24 21:42:15.085382	2025-01-24 21:42:04.696588	\N	\N
17	STORE_RETURN	18	PROCESSED	8.00	Piece	1.00	\N	2025-01-24 22:13:16.181249	2025-01-24 22:04:33.098938	R20250124170433081826	\N
16	STORE_RETURN	17	PROCESSED	1.00	Set	1.00	\N	2025-01-24 22:13:19.894585	2025-01-24 21:59:17.918079	\N	\N
15	STORE_RETURN	16	PROCESSED	9.00	Set	1.00	\N	2025-01-24 22:13:23.518616	2025-01-24 21:56:36.471196	\N	\N
14	STORE_RETURN	15	PROCESSED	10.00	Set	1.00	\N	2025-01-24 22:13:26.955702	2025-01-24 21:50:40.013598	\N	\N
13	STORE_RETURN	14	PROCESSED	10.00	Piece	1.00	\N	2025-01-24 22:13:30.261501	2025-01-24 21:50:22.457102	\N	\N
18	STORE_RETURN	19	PROCESSED	9.00	Set	1.00	\N	2025-01-25 00:42:27.841829	2025-01-24 22:14:30.11361	R20250124171430107259	\N
19	STORE_PURCHASE	48	PROCESSED	15.00	Piece	10.00	150.00	2025-01-25 00:54:11.189856	2025-01-25 00:49:50.199574	\N	\N
21	STORE_PURCHASE	50	PROCESSED	10.00	Litre	100.00	1000.00	2025-01-25 00:55:45.700701	2025-01-25 00:55:38.25659	\N	\N
22	STORE_PURCHASE	51	PROCESSED	123.00	Piece	100.00	12300.00	2025-01-25 01:02:35.381895	2025-01-25 00:59:16.215301	\N	\N
20	STORE_RETURN	20	PROCESSED	10.00	Set	100.00	\N	2025-01-25 01:07:18.885713	2025-01-25 00:50:08.704821	R20250124195008698087	\N
23	STORE_RETURN	21	PROCESSED	12.00	Piece	100.00	\N	2025-01-25 01:12:29.895212	2025-01-25 01:12:17.094639	R20250124201217074184	\N
24	STORE_RETURN	22	PROCESSED	23.00	Piece	100.00	\N	2025-01-25 01:13:42.342915	2025-01-25 01:13:31.774372	R20250124201331770297	\N
25	STORE_PURCHASE	54	PROCESSED	100.00	Piece	100.00	10000.00	2025-01-25 01:15:27.309787	2025-01-25 01:15:15.753023	\N	\N
26	STORE_PURCHASE	55	PROCESSED	100.00	Piece	150.00	15000.00	2025-01-25 01:17:01.574342	2025-01-25 01:16:52.887209	\N	\N
27	STORE_RETURN	23	PROCESSED	3.00	Set	300.00	\N	2025-01-25 01:18:28.462682	2025-01-25 01:18:15.921253	R20250124201815914830	\N
28	STORE_PURCHASE	57	PROCESSED	1234.00	Piece	100.00	123400.00	2025-01-25 01:33:09.238828	2025-01-25 01:32:58.914444	\N	\N
29	STORE_PURCHASE	58	PROCESSED	120.00	Piece	100.00	12000.00	2025-01-25 01:41:36.158746	2025-01-25 01:41:27.422012	\N	\N
30	STORE_RETURN	24	PROCESSED	15.00	Piece	100.00	\N	2025-01-25 01:42:37.158919	2025-01-25 01:42:28.561984	R20250124204228555220	\N
31	STORE_RETURN	25	PROCESSED	1234.00	Piece	100.00	\N	2025-01-25 01:47:28.681437	2025-01-25 01:44:47.069773	R20250124204447051352	\N
33	STORE_RETURN	27	PROCESSED	100.00	Piece	100.00	\N	2025-01-25 01:51:00.592273	2025-01-25 01:50:47.481335	R20250124205047428808	\N
34	STORE_RETURN	28	PROCESSED	30.00	Set	111.00	\N	2025-01-25 01:53:52.207524	2025-01-25 01:53:40.369056	R20250124205340364653	\N
32	STORE_RETURN	26	PROCESSED	99.00	Piece	1000.00	\N	2025-01-25 01:59:06.100101	2025-01-25 01:50:09.209447	R20250124205009203744	\N
35	STORE_PURCHASE	64	PROCESSED	567.00	Piece	100.00	56700.00	2025-01-25 02:01:47.664887	2025-01-25 02:01:38.321214	\N	\N
36	STORE_RETURN	29	PROCESSED	567.00	Piece	100.00	\N	2025-01-25 02:02:28.231983	2025-01-25 02:02:19.970937	R20250124210219964366	\N
37	STORE_PURCHASE	66	PROCESSED	100.00	Litre	100.00	10000.00	2025-01-25 02:05:50.111673	2025-01-25 02:05:42.292391	\N	\N
38	STORE_RETURN	30	PROCESSED	100.00	Liter	100.00	\N	2025-01-25 02:06:29.647709	2025-01-25 02:06:22.787038	R20250124210622781269	\N
39	STORE_PURCHASE	68	PROCESSED	100.00	Piece	888.00	88800.00	2025-01-25 02:10:05.593397	2025-01-25 02:09:52.408601	\N	\N
40	STORE_PURCHASE	69	PROCESSED	13.00	Piece	1300.00	16900.00	2025-01-25 02:11:16.001558	2025-01-25 02:11:06.982965	\N	\N
41	STORE_PURCHASE	70	PROCESSED	150.00	Piece	100.00	15000.00	2025-01-25 02:14:36.649011	2025-01-25 02:14:19.918679	\N	\N
42	STORE_PURCHASE	71	PROCESSED	1678.00	Piece	1.00	1678.00	2025-01-25 02:16:25.769682	2025-01-25 02:16:19.844502	\N	\N
43	STORE_PURCHASE	72	PROCESSED	345.00	Piece	1.00	345.00	2025-01-25 02:17:46.986326	2025-01-25 02:17:41.342547	\N	\N
44	STORE_PURCHASE	73	PROCESSED	12.00	Set	12.00	144.00	2025-01-25 02:19:53.962004	2025-01-25 02:19:47.208868	\N	\N
45	STORE_PURCHASE	74	PROCESSED	1.00	Liter	1.00	1.00	2025-01-25 02:23:23.698169	2025-01-25 02:23:10.887967	\N	\N
46	STORE_RETURN	31	PROCESSED	1.00	Liter	1.00	\N	2025-01-25 02:24:13.536883	2025-01-25 02:24:04.581012	R20250124212404573546	\N
47	STORE_RETURN	32	PROCESSED	13.00	Piece	100.00	\N	2025-01-25 02:31:53.186048	2025-01-25 02:31:44.534705	R20250124213144517187	\N
48	STORE_RETURN	33	PROCESSED	1678.00	Piece	1.00	\N	2025-01-25 02:33:53.626291	2025-01-25 02:33:46.711429	R20250124213346693632	\N
49	STORE_RETURN	34	PROCESSED	100.00	Piece	1.00	\N	2025-01-25 02:35:41.362563	2025-01-25 02:35:35.974713	R20250124213535957747	\N
50	STORE_PURCHASE	79	PROCESSED	14.00	Piece	14.00	196.00	2025-01-25 02:38:20.561771	2025-01-25 02:38:14.246346	\N	\N
51	STORE_RETURN	35	PROCESSED	14.00	Piece	1.00	\N	2025-01-25 02:40:40.730037	2025-01-25 02:40:33.664123	R20250124214033637479	\N
52	STORE_RETURN	36	PROCESSED	150.00	Piece	100.00	\N	2025-01-25 22:14:54.940301	2025-01-25 22:14:40.960623	R20250125171440744375	\N
53	STORE_RETURN	37	PROCESSED	100.00	Piece	100.00	\N	2025-01-25 22:16:43.324487	2025-01-25 22:16:36.25294	R20250125171636248169	\N
54	STORE_RETURN	38	PROCESSED	100.00	Liter	100.00	\N	2025-01-25 22:19:52.591363	2025-01-25 22:19:46.204382	R20250125171946186601	\N
55	STORE_RETURN	39	PROCESSED	2.00	Set	100.00	\N	2025-01-25 22:24:29.49794	2025-01-25 22:24:18.26868	R20250125172418101349	\N
56	STORE_RETURN	40	PROCESSED	345.00	Piece	100.00	\N	2025-01-25 23:09:19.741853	2025-01-25 23:09:10.147401	R20250125180910129853	\N
57	STORE_RETURN	41	PROCESSED	50.00	Liter	100.00	\N	2025-01-25 23:13:26.751822	2025-01-25 23:13:13.344529	R20250125181313274251	Hydraulic Oil
58	STORE_RETURN	42	PROCESSED	50.00	Piece	100.00	\N	2025-01-25 23:15:11.135278	2025-01-25 23:15:03.55666	R20250125181503538915	Air Filter
59	STORE_RETURN	43	PROCESSED	10.00	Liter	100.00	\N	2025-01-25 23:16:49.471545	2025-01-25 23:16:40.701486	R20250125181640683431	Hydraulic Oil
60	STORE_RETURN	44	PROCESSED	10.00	Liter	100.00	\N	2025-01-25 23:20:15.720548	2025-01-25 23:20:09.6059	R20250125182009587367	Hydraulic Oil
61	STORE_RETURN	45	PROCESSED	17.00	Piece	100.00	\N	2025-01-25 23:21:47.055648	2025-01-25 23:21:39.516518	R20250125182139500195	Air Filter
62	STORE_RETURN	46	PROCESSED	14.00	Piece	100.00	\N	2025-01-25 23:23:05.056554	2025-01-25 23:22:56.998234	R20250125182256980276	Air Filter
63	STORE_RETURN	47	PROCESSED	9.00	Piece	100.00	\N	2025-01-25 23:24:28.928435	2025-01-25 23:24:15.517404	R20250125182415500858	Bearing
64	STORE_RETURN	48	PROCESSED	2.00	Set	200.00	\N	2025-01-25 23:30:43.498432	2025-01-25 23:30:34.809313	R20250125183034774735	Brake Pad
65	STORE_PURCHASE	92	PROCESSED	10.00	Piece	100.00	1000.00	2025-01-25 23:37:42.210313	2025-01-25 23:37:34.122463	\N	\N
66	STORE_RETURN	49	PROCESSED	10.00	Piece	1000.00	\N	2025-01-25 23:40:08.194114	2025-01-25 23:40:01.482497	R20250125184001463103	Bearing
67	STORE_PURCHASE	95	PENDING	100.00	Piece	\N	\N	\N	2025-03-09 16:42:48.607888	\N	\N
68	STORE_PURCHASE	98	PENDING	100.00	Piece	\N	\N	\N	2025-03-09 16:46:14.419562	\N	\N
72	STORE_PURCHASE	108	PENDING	138.00	Piece	\N	\N	\N	2025-03-09 16:51:13.203403	\N	\N
73	STORE_PURCHASE	109	PENDING	1200.00	Piece	\N	\N	\N	2025-03-09 16:51:13.203403	\N	\N
74	STORE_PURCHASE	110	PENDING	100.00	Piece	\N	\N	\N	2025-03-09 16:52:24.432526	\N	\N
75	STORE_PURCHASE	111	PENDING	100.00	Litre	\N	\N	\N	2025-03-09 16:54:29.714346	\N	\N
76	STORE_PURCHASE	112	PENDING	10.00	Piece	\N	\N	\N	2025-03-09 16:54:29.714346	\N	\N
77	STORE_RETURN	50	PENDING	70.00	Liter	\N	\N	\N	2025-03-09 17:00:21.936997	R20250309120021876863	Hydraulic Oil
78	STORE_PURCHASE	113	PENDING	100.00	Box	\N	\N	\N	2025-03-09 17:03:01.412371	\N	\N
79	STORE_PURCHASE	114	PENDING	100.00	Piece	\N	\N	\N	2025-03-09 17:03:01.412371	\N	\N
\.


--
-- Data for Name: production; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production (id, date_time, paper_type, total_weight, total_reels, boiler_fuel_type, boiler_fuel_quantity, boiler_fuel_cost, total_yield_percentage, created_at, electricity_units, electricity_unit_price, electricity_cost) FROM stdin;
2	2025-01-28 00:36:32.568	SUPER	0.00	1	Boiler Fuel (Toori)	1500.00	15000.00	90.00	2025-01-28 00:40:51.137921	\N	\N	\N
3	2025-01-29 16:16:48.24	SUPER	100.00	1	Boiler Fuel (Toori)	150.00	7.00	0.00	2025-01-29 16:18:50.211959	\N	\N	\N
4	2025-01-29 16:38:16.196	SUPER	100.00	1	Boiler Fuel (Toori)	120.00	5.00	0.00	2025-01-29 16:38:56.872952	1000.00	55.00	55000.00
19	2025-01-29 22:31:40.59	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	10000.00	0.00	2025-01-29 22:38:41.507122	1000.00	20.00	20000.00
20	2025-01-29 22:31:40.59	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	10000.00	0.00	2025-01-29 22:39:04.091215	1000.00	20.00	20000.00
21	2025-01-29 22:39:53.031	SUPER	1500.00	1	Boiler Fuel (Toori)	1600.00	16000.00	0.00	2025-01-29 22:40:17.991753	1800.00	20.00	36000.00
22	2025-01-29 22:46:43.623	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	10000.00	0.00	2025-01-29 22:47:09.024735	1000.00	11.00	11000.00
23	2025-01-29 22:46:43.623	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	10000.00	0.00	2025-01-29 22:47:11.293741	1000.00	11.00	11000.00
24	2025-01-29 22:48:46.366	SUPER	11.00	1	Boiler Fuel (Toori)	11.00	111.00	0.00	2025-01-29 22:49:17.878157	111.00	11.00	1221.00
25	2025-01-29 22:48:46.366	SUPER	11.00	1	Boiler Fuel (Toori)	11.00	111.00	0.00	2025-01-29 22:55:14.232505	111.00	11.00	1221.00
27	2025-01-29 22:55:16.462	CMP	1000.00	1	Boiler Fuel (Toori)	1000.00	10000.00	0.00	2025-01-29 22:58:03.126602	1000.00	100.00	100000.00
28	2025-01-29 22:58:54.677	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	78.00	0.00	2025-01-29 22:59:37.410734	1000.00	70.00	70000.00
29	2025-01-29 23:01:28.73	SUPER	1500.00	1	Boiler Fuel (Toori)	1600.00	40.00	0.00	2025-01-29 23:01:55.390513	1200.00	55.00	66000.00
30	2025-02-02 22:17:43.972	SUPER	15000.00	1	Boiler Fuel (Toori)	10000.00	250000.00	0.00	2025-02-02 22:19:25.355389	10000.00	50.00	500000.00
32	2025-02-02 23:25:40.162	SUPER	1000.00	1	Boiler Fuel (Toori)	1000.00	25000.00	0.00	2025-02-02 23:26:02.42968	1000.00	50.00	50000.00
35	2025-02-02 23:31:29.588	SUPER	10.00	1	Boiler Fuel (Toori)	5000.00	50000.00	0.00	2025-02-02 23:42:06.623341	1000.00	50.00	50000.00
36	2025-03-11 17:27:58	SUPER	21000.00	6	Boiler Fuel (Toori)	10000.00	250000.00	0.00	2025-03-12 17:30:08.313115	10000.00	50.00	500000.00
37	2025-03-12 18:05:51.534	SUPER	40000.00	0	Boiler Fuel (Toori)	15000.00	1000000.00	0.00	2025-03-12 18:10:27.927281	16000.00	50.00	800000.00
\.


--
-- Data for Name: production_recipe; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_recipe (id, production_id, raddi_type, percentage_used, quantity_used, yield_percentage) FROM stdin;
1	2	petti	100.00	4000.00	\N
2	3	PETTI	50.00	62.50	80.00
3	3	DABBI	50.00	71.43	70.00
4	4	PETTI	100.00	125.00	80.00
19	19	Petti	100.00	2000.00	\N
20	20	Petti	100.00	2000.00	\N
21	21	Petti	100.00	3000.00	\N
22	22	Petti	100.00	2000.00	\N
23	23	Petti	100.00	2000.00	\N
24	24	Petti	100.00	22.00	\N
25	25	Petti	100.00	22.00	\N
26	27	Petti	100.00	2000.00	\N
27	28	Petti	100.00	2000.00	\N
28	29	Petti	100.00	1800.00	80.00
29	30	Petti	100.00	18000.00	80.00
30	32	Petti	100.00	1200.00	80.00
31	35	Petti	100.00	12.00	80.00
32	36	Petti	100.00	25200.00	80.00
33	37	Petti	100.00	48000.00	80.00
\.


--
-- Data for Name: production_reels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_reels (id, production_id, size, weight) FROM stdin;
1	2	15/11	3500.00
2	3	15/10	100.00
3	4	15	100.00
18	19	12	1000.00
19	20	12	1000.00
20	21	14	1500.00
21	22	100	1000.00
22	23	100	1000.00
23	24	12	11.00
24	25	12	11.00
26	27	12	1000.00
27	28	678	1000.00
28	29	134	1500.00
29	30	152	15000.00
30	32	123	1000.00
31	35	123	10.00
32	36	120	3500.00
33	36	120	3500.00
34	36	120	3500.00
35	36	120	3500.00
36	36	120	3500.00
37	36	120	3500.00
\.


--
-- Data for Name: purchasers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchasers (id, name, contact, address, created_at) FROM stdin;
1	Purchaser 1	111-222-3333	789 Buyer St	2025-01-23 23:30:07.590861
2	Purchaser 2	444-555-6666	321 Customer Ave	2025-01-23 23:30:07.590861
\.


--
-- Data for Name: salary_increments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_increments (id, employee_id, previous_salary, new_salary, effective_date, remarks, created_at) FROM stdin;
3	24ME2235	45000.00	55000.00	2024-12-24		2024-12-24 01:32:50.970488
4	24ME2235	55000.00	60000.00	2025-03-07		2025-03-07 16:29:31.09437
\.


--
-- Data for Name: salary_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_payments (id, employee_id, payment_month, payment_year, basic_salary, overtime_amount, deductions, net_amount, payment_date, status) FROM stdin;
5	24MH5017	12	2024	8065.00	806.00	4500.00	4371.00	2025-02-04	PAID
6	24ME2235	12	2024	8871.00	0.00	0.00	8871.00	2025-02-04	PAID
12	24MH5017	1	2025	6452.00	0.00	4500.00	1952.00	2025-02-04	PAID
13	24ME2235	1	2025	7097.00	0.00	0.00	7097.00	2025-02-04	PAID
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_adjustments (id, item_type, quantity, adjustment_type, reference_type, reference_id, date_time, created_at) FROM stdin;
1	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	19	2025-01-29 22:31:40.59	2025-01-29 22:38:41.507122
2	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	20	2025-01-29 22:31:40.59	2025-01-29 22:39:04.091215
3	Petti	-3000.00	PRODUCTION_USAGE	PRODUCTION	21	2025-01-29 22:39:53.031	2025-01-29 22:40:17.991753
4	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	22	2025-01-29 22:46:43.623	2025-01-29 22:47:09.024735
5	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	23	2025-01-29 22:46:43.623	2025-01-29 22:47:11.293741
6	Petti	-22.00	PRODUCTION_USAGE	PRODUCTION	24	2025-01-29 22:48:46.366	2025-01-29 22:49:17.878157
7	Petti	-22.00	PRODUCTION_USAGE	PRODUCTION	25	2025-01-29 22:48:46.366	2025-01-29 22:55:14.232505
8	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	27	2025-01-29 22:55:16.462	2025-01-29 22:58:03.126602
9	Petti	-2000.00	PRODUCTION_USAGE	PRODUCTION	28	2025-01-29 22:58:54.677	2025-01-29 22:59:37.410734
10	Petti	-1800.00	PRODUCTION_USAGE	PRODUCTION	29	2025-01-29 23:01:28.73	2025-01-29 23:01:55.390513
11	Petti	-18000.00	PRODUCTION_USAGE	PRODUCTION	30	2025-02-02 22:17:43.972	2025-02-02 22:19:25.355389
12	Petti	-1200.00	PRODUCTION_USAGE	PRODUCTION	32	2025-02-02 23:25:40.162	2025-02-02 23:26:02.42968
13	TOORI	-1000.00	PRODUCTION_USAGE	PRODUCTION	32	2025-02-02 23:25:40.162	2025-02-02 23:26:02.42968
14	Petti	-12.00	PRODUCTION_USAGE	PRODUCTION	35	2025-02-02 23:31:29.588	2025-02-02 23:42:06.623341
15	Boiler Fuel (Toori)	-5000.00	PRODUCTION_USAGE	PRODUCTION	35	2025-02-02 23:31:29.588	2025-02-02 23:42:06.623341
17	Boiler Fuel (Toori)	1008.00	DECREASE	INCOME_STATEMENT	16	2025-01-01 00:00:00	2025-02-20 01:51:03.248504
18	Petti	658760.00	INCREASE	INCOME_STATEMENT	17	2025-01-01 00:00:00	2025-02-20 01:59:47.654057
19	Petti	653760.00	INCREASE	INCOME_STATEMENT	18	2025-01-01 00:00:00	2025-02-20 02:05:10.204141
20	Petti	-25200.00	PRODUCTION_USAGE	PRODUCTION	36	2025-03-11 17:27:58	2025-03-12 17:30:08.313115
21	Boiler Fuel (Toori)	-10000.00	PRODUCTION_USAGE	PRODUCTION	36	2025-03-11 17:27:58	2025-03-12 17:30:08.313115
22	Petti	-48000.00	PRODUCTION_USAGE	PRODUCTION	37	2025-03-12 18:05:51.534	2025-03-12 18:10:27.927281
23	Boiler Fuel (Toori)	-15000.00	PRODUCTION_USAGE	PRODUCTION	37	2025-03-12 18:05:51.534	2025-03-12 18:10:27.927281
\.


--
-- Data for Name: store_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_entries (id, grn_number, entry_type, item_id, quantity, unit, vendor_id, department, issued_to, vehicle_number, driver_name, date_time, remarks, created_at, reference_type, reference_id) FROM stdin;
1	STI-250123-936	STORE_IN	4	123.00	Piece	3	\N	\N	123	fida	2025-01-23 18:35:05.991		2025-01-23 23:35:20.398852	\N	\N
2	STI-250123-935	STORE_IN	5	12.00	Piece	3	\N	\N	123	fida	2025-01-23 18:35:20.412		2025-01-23 23:48:52.897391	\N	\N
6	MAINT202501230001	STORE_OUT	4	2.00	Piece	\N	\N	\N	\N	\N	2025-01-23 00:00:00	\N	2025-01-24 01:05:59.07582	MAINTENANCE	5
29	\N	STORE_OUT	4	4.00	Piece	\N	\N	\N	\N	\N	2025-01-23 00:00:00	\N	2025-01-24 01:33:49.141234	MAINTENANCE	18
30	\N	STORE_OUT	5	4.00	Set	\N	\N	\N	\N	\N	2025-01-23 00:00:00	\N	2025-01-24 01:33:49.141234	MAINTENANCE	18
31	STI-250124-984	STORE_IN	5	100.00	Set	4	\N	\N	123	fida	2025-01-24 12:44:10.712		2025-01-24 17:44:55.451774	\N	\N
32	STI-250124-934	STORE_IN	6	150.00	Piece	3	\N	\N	123	fida	2025-01-24 12:44:55.479		2025-01-24 17:49:05.469812	\N	\N
33	\N	STORE_OUT	4	10.00	Piece	\N	\N	\N	\N	\N	2025-01-24 00:00:00	\N	2025-01-24 17:57:48.727744	MAINTENANCE	19
34	\N	STORE_OUT	5	10.00	Set	\N	\N	\N	\N	\N	2025-01-24 00:00:00	\N	2025-01-24 17:57:48.727744	MAINTENANCE	19
35	\N	STORE_OUT	4	50.00	Piece	\N	\N	\N	\N	\N	2025-01-24 00:00:00	\N	2025-01-24 18:03:30.680259	MAINTENANCE	20
40	R20250124250124	STORE_RETURN	5	10.00	Set	4	\N	\N	\N	\N	2025-01-24 16:29:02.711		2025-01-24 21:42:04.696588	\N	\N
42	R20250124165022451068	STORE_RETURN	6	10.00	Piece	3	\N	\N	\N	\N	2025-01-24 16:42:06.031		2025-01-24 21:50:22.457102	\N	\N
43	R20250124165040009890	STORE_RETURN	5	10.00	Set	4	\N	\N	\N	\N	2025-01-24 16:50:25.792		2025-01-24 21:50:40.013598	\N	\N
44	R20250124165636466421	STORE_RETURN	5	9.00	Set	4	\N	\N	\N	\N	2025-01-24 16:50:41.256		2025-01-24 21:56:36.471196	\N	\N
45	R20250124165917914776	STORE_RETURN	5	1.00	Set	3	\N	\N	\N	\N	2025-01-24 16:56:37.496		2025-01-24 21:59:17.918079	\N	\N
46	R20250124170433081826	STORE_RETURN	4	8.00	Piece	3	\N	\N	\N	\N	2025-01-24 16:59:18.976		2025-01-24 22:04:33.098938	\N	\N
47	R20250124171430107259	STORE_RETURN	5	9.00	Set	4	\N	\N	\N	\N	2025-01-24 17:10:25.583		2025-01-24 22:14:30.11361	\N	\N
48	STI-250125-473	STORE_IN	6	15.00	Piece	4	\N	\N	123	fida	2025-01-24 19:49:35.867		2025-01-25 00:49:50.199574	\N	\N
49	R20250124195008698087	STORE_RETURN	5	10.00	Set	4	\N	\N	\N	\N	2025-01-24 19:49:59.105		2025-01-25 00:50:08.704821	\N	\N
50	STI-250125-779	STORE_IN	3	10.00	Litre	3	\N	\N	123	ali	2025-01-24 19:53:57.789		2025-01-25 00:55:38.25659	\N	\N
51	STI-250125-057	STORE_IN	2	123.00	Piece	3	\N	\N	123	fida	2025-01-24 19:55:38.282		2025-01-25 00:59:16.215301	\N	\N
52	R20250124201217074184	STORE_RETURN	4	12.00	Piece	3	\N	\N	\N	\N	2025-01-24 20:12:05.048		2025-01-25 01:12:17.094639	\N	\N
53	R20250124201331770297	STORE_RETURN	2	23.00	Piece	3	\N	\N	\N	\N	2025-01-24 20:12:18.377		2025-01-25 01:13:31.774372	\N	\N
54	STI-250125-993	STORE_IN	3	100.00	Piece	4	\N	\N	123	fida	2025-01-24 20:14:59.732		2025-01-25 01:15:15.753023	\N	\N
55	STI-250125-315	STORE_IN	3	100.00	Piece	3	\N	\N	123	fida	2025-01-24 20:15:15.764		2025-01-25 01:16:52.887209	\N	\N
56	R20250124201815914830	STORE_RETURN	5	3.00	Set	3	\N	\N	\N	\N	2025-01-24 20:18:04.58		2025-01-25 01:18:15.921253	\N	\N
57	STI-250125-416	STORE_IN	4	1234.00	Piece	3	\N	\N	123	fida	2025-01-24 20:32:44.946		2025-01-25 01:32:58.914444	\N	\N
58	STI-250125-573	STORE_IN	6	120.00	Piece	3	\N	\N	123	fida	2025-01-24 20:32:58.926		2025-01-25 01:41:27.422012	\N	\N
59	R20250124204228555220	STORE_RETURN	6	15.00	Piece	4	\N	\N	\N	\N	2025-01-24 20:42:19.785		2025-01-25 01:42:28.561984	\N	\N
60	R20250124204447051352	STORE_RETURN	4	1234.00	Piece	3	\N	\N	\N	\N	2025-01-24 20:42:29.794		2025-01-25 01:44:47.069773	\N	\N
61	R20250124205009203744	STORE_RETURN	6	99.00	Piece	3	\N	\N	\N	\N	2025-01-24 20:44:48.122		2025-01-25 01:50:09.209447	\N	\N
62	R20250124205047428808	STORE_RETURN	6	100.00	Piece	3	\N	\N	\N	\N	2025-01-24 20:50:10.195		2025-01-25 01:50:47.481335	\N	\N
63	R20250124205340364653	STORE_RETURN	5	30.00	Set	4	\N	\N	\N	\N	2025-01-24 20:50:48.834		2025-01-25 01:53:40.369056	\N	\N
64	STI-250125-661	STORE_IN	6	567.00	Piece	3	\N	\N	123	fida	2025-01-24 21:01:26.243		2025-01-25 02:01:38.321214	\N	\N
65	R20250124210219964366	STORE_RETURN	6	567.00	Piece	3	\N	\N	\N	\N	2025-01-24 21:02:10.42		2025-01-25 02:02:19.970937	\N	\N
66	STI-250125-868	STORE_IN	1	100.00	Litre	3	\N	\N	123	fida	2025-01-24 21:05:25.593		2025-01-25 02:05:42.292391	\N	\N
67	R20250124210622781269	STORE_RETURN	1	100.00	Liter	3	\N	\N	\N	\N	2025-01-24 21:06:14.504		2025-01-25 02:06:22.787038	\N	\N
68	STI-250125-143	STORE_IN	6	100.00	Piece	3	\N	\N	123	fida	2025-01-24 21:09:37.969		2025-01-25 02:09:52.408601	\N	\N
69	STI-250125-161	STORE_IN	2	13.00	Piece	4	\N	\N	123	fida	2025-01-24 21:09:52.419		2025-01-25 02:11:06.982965	\N	\N
70	STI-250125-646	STORE_IN	2	150.00	Piece	3	\N	\N	123	fida	2025-01-24 21:11:07.308		2025-01-25 02:14:19.918679	\N	\N
71	STI-250125-881	STORE_IN	4	1678.00	Piece	3	\N	\N	123	fida	2025-01-24 21:14:19.93		2025-01-25 02:16:19.844502	\N	\N
72	STI-250125-346	STORE_IN	2	345.00	Piece	4	\N	\N	123	fida	2025-01-24 21:16:19.857		2025-01-25 02:17:41.342547	\N	\N
73	STI-250125-523	STORE_IN	5	12.00	Set	3	\N	\N	123	fida	2025-01-24 21:17:41.355		2025-01-25 02:19:47.208868	\N	\N
74	STI-250125-586	STORE_IN	1	1.00	Liter	4	\N	\N	123	fida	2025-01-24 21:19:47.22		2025-01-25 02:23:10.887967	\N	\N
75	R20250124212404573546	STORE_RETURN	1	1.00	Liter	4	\N	\N	\N	\N	2025-01-24 21:23:54.793		2025-01-25 02:24:04.581012	\N	\N
76	R20250124213144517187	STORE_RETURN	2	13.00	Piece	4	\N	\N	\N	\N	2025-01-24 21:24:06.219		2025-01-25 02:31:44.534705	\N	\N
77	R20250124213346693632	STORE_RETURN	4	1678.00	Piece	3	\N	\N	\N	\N	2025-01-24 21:31:45.7		2025-01-25 02:33:46.711429	\N	\N
78	R20250124213535957747	STORE_RETURN	6	100.00	Piece	3	\N	\N	\N	\N	2025-01-24 21:33:47.691		2025-01-25 02:35:35.974713	\N	\N
79	STI-250125-579	STORE_IN	6	14.00	Piece	3	\N	\N	123	fida	2025-01-24 21:38:00.916		2025-01-25 02:38:14.246346	\N	\N
80	R20250124214033637479	STORE_RETURN	6	14.00	Piece	3	\N	\N	\N	\N	2025-01-24 21:38:30.211		2025-01-25 02:40:33.664123	\N	\N
81	R20250125171440744375	STORE_RETURN	2	150.00	Piece	3	\N	\N	\N	\N	2025-01-25 17:14:29.34		2025-01-25 22:14:40.960623	\N	\N
82	R20250125171636248169	STORE_RETURN	2	100.00	Piece	3	\N	\N	\N	\N	2025-01-25 17:14:42.799		2025-01-25 22:16:36.25294	\N	\N
83	R20250125171946186601	STORE_RETURN	3	100.00	Liter	3	\N	\N	\N	\N	2025-01-25 17:16:37.328		2025-01-25 22:19:46.204382	\N	\N
84	R20250125172418101349	STORE_RETURN	5	2.00	Set	4	\N	\N	\N	\N	2025-01-25 17:19:46.961		2025-01-25 22:24:18.26868	\N	\N
85	R20250125180910129853	STORE_RETURN	2	345.00	Piece	4	\N	\N	\N	\N	2025-01-25 17:24:19.219		2025-01-25 23:09:10.147401	\N	\N
87	R20250125181313274251	STORE_RETURN	3	50.00	Liter	4	\N	\N	\N	\N	2025-01-25 18:09:11.344		2025-01-25 23:13:13.344529	\N	\N
88	R20250125181503538915	STORE_RETURN	4	50.00	Piece	3	\N	\N	\N	\N	2025-01-25 18:13:14.417		2025-01-25 23:15:03.55666	\N	\N
89	R20250125181640683431	STORE_RETURN	3	10.00	Liter	4	\N	\N	\N	\N	2025-01-25 18:15:04.593		2025-01-25 23:16:40.701486	\N	\N
90	R20250125182009587367	STORE_RETURN	3	10.00	Liter	4	\N	\N	\N	\N	2025-01-25 18:16:41.737		2025-01-25 23:20:09.6059	\N	\N
91	R20250125182139500195	STORE_RETURN	4	17.00	Piece	3	\N	\N	\N	\N	2025-01-25 18:20:10.506		2025-01-25 23:21:39.516518	\N	\N
92	STI-250125-900	STORE_IN	6	10.00	Piece	3	\N	\N	234	ali	2025-01-25 18:37:23.659		2025-01-25 23:37:34.122463	\N	\N
93	\N	STORE_OUT	6	10.00	Piece	\N	\N	\N	\N	\N	2025-02-02 00:00:00	\N	2025-02-02 22:17:22.480498	MAINTENANCE	21
94	\N	STORE_OUT	5	10.00	Set	\N	\N	\N	\N	\N	2025-02-02 00:00:00	\N	2025-02-02 22:17:22.480498	MAINTENANCE	21
95	STI-250309-322	STORE_IN	4	100.00	Piece	4	\N	\N	123	fida	2025-03-09 11:30:32.335		2025-03-09 16:42:48.607888	\N	\N
98	STI-250309-120	STORE_IN	4	100.00	Piece	3	\N	\N	123	fida	2025-03-09 11:45:36.752		2025-03-09 16:46:14.419562	\N	\N
108	STI-250309-776-01	STORE_IN	3	138.00	Piece	4	\N	\N	123	fida	2025-03-09 11:49:26.258		2025-03-09 16:51:13.203403	\N	\N
109	STI-250309-776-02	STORE_IN	4	1200.00	Piece	4	\N	\N	123	fida	2025-03-09 11:49:26.258		2025-03-09 16:51:13.203403	\N	\N
110	-01	STORE_IN	7	100.00	Piece	3	\N	\N	3454	fida	2025-03-09 11:51:13.429		2025-03-09 16:52:24.432526	\N	\N
111	STI-250309-385-01	STORE_IN	1	100.00	Litre	3	\N	\N	123	fida	2025-03-09 11:54:02.729		2025-03-09 16:54:29.714346	\N	\N
112	STI-250309-385-02	STORE_IN	5	10.00	Piece	3	\N	\N	123	fida	2025-03-09 11:54:02.729		2025-03-09 16:54:29.714346	\N	\N
113	STI-250309-143-01	STORE_IN	8	100.00	Box	4	\N	\N	123	fida	2025-03-09 12:02:03.922		2025-03-09 17:03:01.412371	\N	\N
114	STI-250309-143-02	STORE_IN	9	100.00	Piece	4	\N	\N	123	fida	2025-03-09 12:02:03.922		2025-03-09 17:03:01.412371	\N	\N
\.


--
-- Data for Name: store_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_items (id, item_name, item_code, category, unit, current_stock, created_at) FROM stdin;
2	Spare Tire	ST001	Vehicle Parts	Piece	0.00	2025-01-23 23:30:07.590861
6	Bearing	B795	Others	Piece	32.00	2025-01-24 17:48:49.583305
4	Air Filter	AF001	Filters	Piece	1422.00	2025-01-23 23:30:07.590861
7	Nuts	N265	Others	Piece	100.00	2025-03-09 16:23:01.706937
1	Engine Oil	EO001	Lubricants	Liter	100.00	2025-01-23 23:30:07.590861
5	Brake Pad	BP001	Vehicle Parts	Set	36.00	2025-01-23 23:30:07.590861
3	Hydraulic Oil	HO001	Lubricants	Liter	108.00	2025-01-23 23:30:07.590861
8	Grease	G189	Others	Piece	100.00	2025-03-09 17:02:20.892665
9	Tape	T425	Others	Piece	100.00	2025-03-09 17:02:43.722176
\.


--
-- Data for Name: store_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_returns (id, grn_number, quantity, date_time, remarks, created_at, return_grn, item_name, unit) FROM stdin;
1	STI-250123-935	8.00	2025-01-24 12:41:22.5		2025-01-24 17:41:40.407124	\N	\N	\N
2	STI-250123-936	5.00	2025-01-24 12:52:41.589		2025-01-24 18:24:29.303693	\N	\N	\N
6	STI-250123-936	5.00	2025-01-24 13:24:30.48		2025-01-24 18:48:05.262116	\N	\N	\N
7	STI-250124-984	10.00	2025-01-24 13:48:06.921		2025-01-24 18:50:20.740251	\N	\N	\N
8	STI-250124-934	10.00	2025-01-24 13:59:52.768		2025-01-24 19:00:20.078182	\N	\N	\N
9	STI-250124-934	10.00	2025-01-24 14:00:21.265		2025-01-24 21:25:52.599154	\N	\N	\N
11	STI-250124-984	10.00	2025-01-24 16:25:53.967		2025-01-24 21:29:01.120557	\N	\N	\N
13	STI-250124-984	10.00	2025-01-24 16:29:02.711		2025-01-24 21:42:04.696588	R20250124250124	\N	\N
14	STI-250124-934	10.00	2025-01-24 16:42:06.031		2025-01-24 21:50:22.457102	R20250124165022451068	\N	\N
15	STI-250124-984	10.00	2025-01-24 16:50:25.792		2025-01-24 21:50:40.013598	R20250124165040009890	\N	\N
16	STI-250124-984	9.00	2025-01-24 16:50:41.256		2025-01-24 21:56:36.471196	R20250124165636466421	\N	\N
17	STI-250123-935	1.00	2025-01-24 16:56:37.496		2025-01-24 21:59:17.918079	R20250124165917914776	\N	\N
18	STI-250123-936	8.00	2025-01-24 16:59:18.976		2025-01-24 22:04:33.098938	R20250124170433081826	\N	\N
19	STI-250124-984	9.00	2025-01-24 17:10:25.583		2025-01-24 22:14:30.11361	R20250124171430107259	\N	\N
20	STI-250124-984	10.00	2025-01-24 19:49:59.105		2025-01-25 00:50:08.704821	R20250124195008698087	\N	\N
21	STI-250123-936	12.00	2025-01-24 20:12:05.048		2025-01-25 01:12:17.094639	R20250124201217074184	\N	\N
22	STI-250125-057	23.00	2025-01-24 20:12:18.377		2025-01-25 01:13:31.774372	R20250124201331770297	\N	\N
23	STI-250123-935	3.00	2025-01-24 20:18:04.58		2025-01-25 01:18:15.921253	R20250124201815914830	\N	\N
24	STI-250125-473	15.00	2025-01-24 20:42:19.785		2025-01-25 01:42:28.561984	R20250124204228555220	\N	\N
25	STI-250125-416	1234.00	2025-01-24 20:42:29.794		2025-01-25 01:44:47.069773	R20250124204447051352	\N	\N
26	STI-250125-573	99.00	2025-01-24 20:44:48.122		2025-01-25 01:50:09.209447	R20250124205009203744	\N	\N
27	STI-250124-934	100.00	2025-01-24 20:50:10.195		2025-01-25 01:50:47.481335	R20250124205047428808	\N	\N
28	STI-250124-984	30.00	2025-01-24 20:50:48.834		2025-01-25 01:53:40.369056	R20250124205340364653	\N	\N
29	STI-250125-661	567.00	2025-01-24 21:02:10.42		2025-01-25 02:02:19.970937	R20250124210219964366	\N	\N
30	STI-250125-868	100.00	2025-01-24 21:06:14.504		2025-01-25 02:06:22.787038	R20250124210622781269	\N	\N
31	STI-250125-586	1.00	2025-01-24 21:23:54.793		2025-01-25 02:24:04.581012	R20250124212404573546	\N	\N
32	STI-250125-161	13.00	2025-01-24 21:24:06.219		2025-01-25 02:31:44.534705	R20250124213144517187	\N	\N
33	STI-250125-881	1678.00	2025-01-24 21:31:45.7		2025-01-25 02:33:46.711429	R20250124213346693632	\N	\N
34	STI-250125-143	100.00	2025-01-24 21:33:47.691		2025-01-25 02:35:35.974713	R20250124213535957747	\N	\N
35	STI-250125-579	14.00	2025-01-24 21:38:30.211		2025-01-25 02:40:33.664123	R20250124214033637479	\N	\N
36	STI-250125-646	150.00	2025-01-25 17:14:29.34		2025-01-25 22:14:40.960623	R20250125171440744375	\N	\N
37	STI-250125-057	100.00	2025-01-25 17:14:42.799		2025-01-25 22:16:36.25294	R20250125171636248169	\N	\N
38	STI-250125-315	100.00	2025-01-25 17:16:37.328		2025-01-25 22:19:46.204382	R20250125171946186601	\N	\N
39	STI-250124-984	2.00	2025-01-25 17:19:46.961		2025-01-25 22:24:18.26868	R20250125172418101349	\N	\N
40	STI-250125-346	345.00	2025-01-25 17:24:19.219		2025-01-25 23:09:10.147401	R20250125180910129853	\N	\N
41	STI-250125-993	50.00	2025-01-25 18:09:11.344		2025-01-25 23:13:13.344529	R20250125181313274251	Hydraulic Oil	Liter
42	STI-250123-936	50.00	2025-01-25 18:13:14.417		2025-01-25 23:15:03.55666	R20250125181503538915	Air Filter	Piece
43	STI-250125-993	10.00	2025-01-25 18:15:04.593		2025-01-25 23:16:40.701486	R20250125181640683431	Hydraulic Oil	Liter
44	STI-250125-993	10.00	2025-01-25 18:16:41.737		2025-01-25 23:20:09.6059	R20250125182009587367	Hydraulic Oil	Liter
45	STI-250123-936	17.00	2025-01-25 18:20:10.506		2025-01-25 23:21:39.516518	R20250125182139500195	Air Filter	Piece
46	STI-250123-936	14.00	2025-01-25 18:21:40.61		2025-01-25 23:22:56.998234	R20250125182256980276	Air Filter	Piece
47	STI-250124-934	9.00	2025-01-25 18:22:58.378		2025-01-25 23:24:15.517404	R20250125182415500858	Bearing	Piece
48	STI-250125-523	2.00	2025-01-25 18:24:18.611		2025-01-25 23:30:34.809313	R20250125183034774735	Brake Pad	Set
49	STI-250125-900	10.00	2025-01-25 18:39:54.666		2025-01-25 23:40:01.482497	R20250125184001463103	Bearing	Piece
50	STI-250309-776-01	70.00	2025-03-09 11:59:40.792		2025-03-09 17:00:21.936997	R20250309120021876863	Hydraulic Oil	Liter
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, contact, address, created_at) FROM stdin;
1	Supplier 1	123-456-7890	123 Supplier St	2025-01-23 23:30:07.590861
2	Supplier 2	098-765-4321	456 Vendor Ave	2025-01-23 23:30:07.590861
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, transaction_date, account_id, reference_no, entry_type, amount, description, item_name, quantity, unit, price_per_unit, created_at, processed_by_role) FROM stdin;
1	2025-01-23 23:31:57.398	1	GRN-BRM-250123-390	DEBIT	1481400.00	Purchase against GRN: GRN-BRM-250123-390	\N	\N	\N	\N	2025-01-23 23:31:57.397223	\N
2	2025-01-23 23:34:28.383	2	SO-AWP-250123-002	CREDIT	1851750.00	Sale against GRN: SO-AWP-250123-002	\N	\N	\N	\N	2025-01-23 23:34:28.381972	\N
3	2025-01-23 18:35:05.991	3	STI-250123-936	CREDIT	123000.00	Store Purchase: Air Filter	Air Filter	123.00	Piece	1000.00	2025-01-23 23:35:28.628296	\N
4	2025-01-23 18:35:20.412	3	STI-250123-935	CREDIT	1476.00	Store Purchase: Brake Pad	Brake Pad	12.00	Piece	123.00	2025-01-23 23:48:59.502048	\N
5	2025-01-24 12:44:10.712	4	STI-250124-984	CREDIT	100000.00	Store Purchase: Brake Pad	Brake Pad	100.00	Set	1000.00	2025-01-24 17:48:22.250276	\N
6	2025-01-24 12:44:55.479	3	STI-250124-934	CREDIT	75000.00	Store Purchase: Bearing	Bearing	150.00	Piece	500.00	2025-01-24 18:53:08.392179	\N
7	2025-01-24 21:33:13.47	4	STI-250124-984	CREDIT	1000.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-24 21:33:13.458376	\N
8	2025-01-24 21:42:15.087	4	STI-250124-984	CREDIT	1000.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-24 21:42:15.085382	\N
9	2025-01-24 22:13:16.184	3	R20250124170433081826	CREDIT	8.00	STORE_RETURN against GRN: STI-250123-936	\N	\N	\N	\N	2025-01-24 22:13:16.181249	\N
10	2025-01-24 22:13:19.896	3	R20250124165917914776	CREDIT	1.00	STORE_RETURN against GRN: STI-250123-935	\N	\N	\N	\N	2025-01-24 22:13:19.894585	\N
11	2025-01-24 22:13:23.52	4	R20250124165636466421	CREDIT	9.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-24 22:13:23.518616	\N
12	2025-01-24 22:13:26.957	4	R20250124165040009890	CREDIT	10.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-24 22:13:26.955702	\N
13	2025-01-24 22:13:30.262	3	R20250124165022451068	CREDIT	10.00	STORE_RETURN against GRN: STI-250124-934	\N	\N	\N	\N	2025-01-24 22:13:30.261501	\N
14	2025-01-25 00:42:27.845	4	R20250124171430107259	CREDIT	9.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-25 00:42:27.841829	\N
15	2025-01-25 00:49:01.879	1	GRN-BSP-250124-671	DEBIT	15.00	Purchase against GRN: GRN-BSP-250124-671	\N	\N	\N	\N	2025-01-25 00:49:01.877546	\N
16	2025-01-24 19:49:35.867	4	STI-250125-473	CREDIT	150.00	Store Purchase: Bearing	Bearing	15.00	Piece	10.00	2025-01-25 00:54:11.189856	\N
17	2025-01-24 19:53:57.789	3	STI-250125-779	CREDIT	1000.00	Store Purchase: Hydraulic Oil	Hydraulic Oil	10.00	Litre	100.00	2025-01-25 00:55:45.700701	\N
18	2025-01-24 19:55:38.282	3	STI-250125-057	CREDIT	12300.00	Store Purchase: Spare Tire	Spare Tire	123.00	Piece	100.00	2025-01-25 01:02:35.381895	\N
19	2025-01-25 01:04:06.567	1	RET-250125-159	DEBIT	15000.00	PURCHASE_RETURN against GRN: GRN-BSP-250124-671	\N	\N	\N	\N	2025-01-25 01:04:06.566058	\N
20	2025-01-25 01:04:30.087	2	SRET-250125-539	CREDIT	1234500.00	SALE_RETURN against GRN: SO-AN-250125-669	\N	\N	\N	\N	2025-01-25 01:04:30.085701	\N
21	2025-01-25 01:07:18.896	4	R20250124195008698087	CREDIT	1000.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-25 01:07:18.885713	\N
22	2025-01-25 01:12:29.896	3	R20250124201217074184	CREDIT	1200.00	STORE_RETURN against GRN: STI-250123-936	\N	\N	\N	\N	2025-01-25 01:12:29.895212	\N
23	2025-01-25 01:13:42.344	3	R20250124201331770297	CREDIT	2300.00	STORE_RETURN against GRN: STI-250125-057	\N	\N	\N	\N	2025-01-25 01:13:42.342915	\N
24	2025-01-24 20:14:59.732	4	STI-250125-993	CREDIT	10000.00	Store Purchase: Hydraulic Oil	Hydraulic Oil	100.00	Piece	100.00	2025-01-25 01:15:27.309787	\N
25	2025-01-24 20:15:15.764	3	STI-250125-315	CREDIT	15000.00	Store Purchase: Hydraulic Oil	Hydraulic Oil	100.00	Piece	150.00	2025-01-25 01:17:01.574342	\N
26	2025-01-25 01:18:28.471	3	R20250124201815914830	CREDIT	900.00	STORE_RETURN against GRN: STI-250123-935	\N	\N	\N	\N	2025-01-25 01:18:28.462682	\N
27	2025-01-25 01:24:40.641	1	GRN-BPM-250125-712	DEBIT	1234500.00	Purchase against GRN: GRN-BPM-250125-712	\N	\N	\N	\N	2025-01-25 01:24:40.639618	\N
28	2025-01-25 01:30:07.782	2	SO-AN-250125-669	CREDIT	1234500.00	Sale against GRN: SO-AN-250125-669	\N	\N	\N	\N	2025-01-25 01:30:07.781391	\N
29	2025-01-24 20:32:44.946	3	STI-250125-416	CREDIT	123400.00	Store Purchase: Air Filter	Air Filter	1234.00	Piece	100.00	2025-01-25 01:33:09.238828	\N
30	2025-01-24 20:32:58.926	3	STI-250125-573	CREDIT	12000.00	Store Purchase: Bearing	Bearing	120.00	Piece	100.00	2025-01-25 01:41:36.158746	\N
31	2025-01-24 20:42:19.785	4	R20250124204228555220	CREDIT	1500.00	STORE_RETURN against GRN: STI-250125-473	\N	\N	\N	\N	2025-01-25 01:42:37.158919	\N
32	2025-01-24 20:42:29.794	3	R20250124204447051352	CREDIT	123400.00	STORE_RETURN against GRN: STI-250125-416	\N	\N	\N	\N	2025-01-25 01:47:28.681437	\N
33	2025-01-24 20:50:10.195	3	R20250124205047428808	CREDIT	10000.00	STORE_RETURN against GRN: STI-250124-934	\N	\N	\N	\N	2025-01-25 01:51:00.592273	\N
34	2025-01-24 20:50:48.834	4	R20250124205340364653	CREDIT	3330.00	STORE_RETURN against GRN: STI-250124-984	\N	\N	\N	\N	2025-01-25 01:53:52.207524	\N
35	2025-01-25 01:44:48.122	3	R20250124205009203744	CREDIT	99000.00	STORE_RETURN against GRN: STI-250125-573	\N	\N	\N	\N	2025-01-25 01:59:06.100101	\N
36	2025-01-24 21:01:26.243	3	STI-250125-661	CREDIT	56700.00	Store Purchase: Bearing	Bearing	567.00	Piece	100.00	2025-01-25 02:01:47.664887	\N
37	2025-01-25 02:02:28.231	3	R20250124210219964366	CREDIT	56700.00	STORE_RETURN against GRN: STI-250125-661	\N	\N	\N	\N	2025-01-25 02:02:28.231983	\N
38	2025-01-24 21:05:25.593	3	STI-250125-868	CREDIT	10000.00	Store Purchase: Engine Oil	Engine Oil	100.00	Litre	100.00	2025-01-25 02:05:50.111673	\N
39	2025-01-25 02:06:29.647	3	R20250124210622781269	CREDIT	10000.00	STORE_RETURN against GRN: STI-250125-868	\N	\N	\N	\N	2025-01-25 02:06:29.647709	\N
40	2025-01-24 21:09:37.969	3	STI-250125-143	CREDIT	88800.00	Store Purchase: Bearing	Bearing	100.00	Piece	888.00	2025-01-25 02:10:05.593397	\N
41	2025-01-24 21:09:52.419	4	STI-250125-161	DEBIT	0.00	STORE_IN: STI-250125-161	\N	\N	\N	\N	2025-01-25 02:11:06.982965	\N
42	2025-01-24 21:09:52.419	4	STI-250125-161	CREDIT	16900.00	Store Purchase: Spare Tire	Spare Tire	13.00	Piece	1300.00	2025-01-25 02:11:16.001558	\N
43	2025-01-24 21:11:07.308	3	STI-250125-646	DEBIT	0.00	STORE_IN: STI-250125-646	\N	\N	\N	\N	2025-01-25 02:14:19.918679	\N
44	2025-01-24 21:11:07.308	3	STI-250125-646	CREDIT	15000.00	Store Purchase: Spare Tire	Spare Tire	150.00	Piece	100.00	2025-01-25 02:14:36.649011	\N
45	2025-01-24 21:14:19.93	3	STI-250125-881	DEBIT	0.00	STORE_IN: STI-250125-881	\N	\N	\N	\N	2025-01-25 02:16:19.844502	\N
46	2025-01-24 21:14:19.93	3	STI-250125-881	CREDIT	1678.00	Store Purchase: Air Filter	Air Filter	1678.00	Piece	1.00	2025-01-25 02:16:25.769682	\N
47	2025-01-24 21:16:19.857	4	STI-250125-346	DEBIT	0.00	STORE_IN: STI-250125-346	\N	\N	\N	\N	2025-01-25 02:17:41.342547	\N
48	2025-01-24 21:16:19.857	4	STI-250125-346	CREDIT	345.00	Store Purchase: Spare Tire	Spare Tire	345.00	Piece	1.00	2025-01-25 02:17:46.986326	\N
49	2025-01-24 21:17:41.355	3	STI-250125-523	CREDIT	144.00	Store Purchase: Brake Pad	Brake Pad	12.00	Set	12.00	2025-01-25 02:19:53.962004	\N
50	2025-01-25 02:23:23.698	4	STI-250125-586	CREDIT	1.00	Store Purchase: Engine Oil	Engine Oil	1.00	Liter	1.00	2025-01-25 02:23:23.698169	\N
51	2025-01-25 02:24:13.536	4	R20250124212404573546	CREDIT	1.00	STORE_RETURN against GRN: STI-250125-586	\N	\N	\N	\N	2025-01-25 02:24:13.536883	\N
52	2025-01-25 02:31:53.186	4	R20250124213144517187	CREDIT	1300.00	STORE_RETURN against GRN: STI-250125-161	Spare Tire	13.00	Piece	100.00	2025-01-25 02:31:53.186048	\N
53	2025-01-25 02:33:53.626	3	R20250124213346693632	CREDIT	1678.00	STORE_RETURN against GRN: STI-250125-881	Air Filter	1678.00	Piece	1.00	2025-01-25 02:33:53.626291	\N
54	2025-01-25 02:35:41.362	3	R20250124213535957747	CREDIT	100.00	STORE_RETURN against GRN: STI-250125-143	Bearing	100.00	Piece	1.00	2025-01-25 02:35:41.362563	\N
55	2025-01-25 02:38:20.561	3	STI-250125-579	CREDIT	196.00	Store Purchase: Bearing	Bearing	14.00	Piece	14.00	2025-01-25 02:38:20.561771	\N
56	2025-01-25 02:40:40.73	3	R20250124214033637479	CREDIT	14.00	STORE_RETURN against GRN: STI-250125-579	Bearing	14.00	Piece	1.00	2025-01-25 02:40:40.730037	\N
57	2025-01-25 22:14:54.94	3	R20250125171440744375	CREDIT	15000.00	STORE_RETURN against GRN: STI-250125-646	Spare Tire	150.00	Piece	100.00	2025-01-25 22:14:54.940301	\N
58	2025-01-25 22:16:43.324	3	R20250125171636248169	CREDIT	10000.00	STORE_RETURN against GRN: STI-250125-057	Spare Tire	100.00	Piece	100.00	2025-01-25 22:16:43.324487	\N
59	2025-01-25 22:19:52.591	3	R20250125171946186601	CREDIT	10000.00	STORE_RETURN against GRN: STI-250125-315	Hydraulic Oil	100.00	Liter	100.00	2025-01-25 22:19:52.591363	\N
60	2025-01-25 22:24:29.497	4	R20250125172418101349	CREDIT	200.00	STORE_RETURN	Brake Pad	2.00	Set	100.00	2025-01-25 22:24:29.49794	\N
61	2025-01-25 23:09:19.741	4	R20250125180910129853	CREDIT	34500.00	STORE_RETURN	Spare Tire	345.00	Piece	100.00	2025-01-25 23:09:19.741853	\N
62	2025-01-25 23:13:26.751	4	R20250125181313274251	CREDIT	5000.00	STORE_RETURN	Hydraulic Oil	50.00	Liter	100.00	2025-01-25 23:13:26.751822	\N
63	2025-01-25 23:15:11.135	3	R20250125181503538915	CREDIT	5000.00	STORE_RETURN	Air Filter	50.00	Piece	100.00	2025-01-25 23:15:11.135278	\N
64	2025-01-25 23:16:49.471	4	R20250125181640683431	CREDIT	1000.00	STORE_RETURN	Hydraulic Oil	10.00	Liter	100.00	2025-01-25 23:16:49.471545	\N
65	2025-01-25 23:20:15.72	4	R20250125182009587367	CREDIT	1000.00	STORE_RETURN	Hydraulic Oil	10.00	Liter	100.00	2025-01-25 23:20:15.720548	\N
66	2025-01-25 23:21:47.055	3	R20250125182139500195	CREDIT	1700.00	STORE_RETURN	Air Filter	17.00	Piece	100.00	2025-01-25 23:21:47.055648	\N
67	2025-01-25 23:23:05.056	3	R20250125182256980276	CREDIT	1400.00	STORE_RETURN	Air Filter	14.00	Piece	100.00	2025-01-25 23:23:05.056554	\N
68	2025-01-25 23:24:28.928	3	R20250125182415500858	CREDIT	900.00	STORE_RETURN	Bearing	9.00	Piece	100.00	2025-01-25 23:24:28.928435	\N
69	2025-01-25 23:30:43.498	3	R20250125183034774735	CREDIT	400.00	STORE_RETURN	Brake Pad	2.00	Set	200.00	2025-01-25 23:30:43.498432	\N
70	2025-01-25 23:37:42.21	3	STI-250125-900	CREDIT	1000.00	Store Purchase: Bearing	Bearing	10.00	Piece	100.00	2025-01-25 23:37:42.210313	\N
71	2025-01-25 23:40:08.194	3	R20250125184001463103	DEBIT	10000.00	STORE_RETURN	Bearing	10.00	Piece	1000.00	2025-01-25 23:40:08.194114	\N
72	2025-01-26 22:03:53.556	1	GRN-BP-250126-829	DEBIT	604200.00	Purchase against GRN: GRN-BP-250126-829	\N	\N	\N	\N	2025-01-26 22:03:53.550814	\N
73	2025-01-26 22:15:52.166	1	GRN-BMM-250126-347	DEBIT	49000.00	Purchase against GRN: GRN-BMM-250126-347	\N	\N	\N	\N	2025-01-26 22:15:52.158323	\N
74	2025-01-26 22:47:00.367	1	GRN-BP-250126-135	DEBIT	1234500.00	Purchase against GRN: GRN-BP-250126-135	\N	\N	\N	\N	2025-01-26 22:47:00.362757	\N
75	2025-01-26 22:57:38.68	1	GRN-BMM-250126-605	DEBIT	15000.00	Purchase against GRN: GRN-BMM-250126-605	\N	\N	\N	\N	2025-01-26 22:57:38.679125	\N
76	2025-02-02 21:53:49.899	1	GRN-BBF-250202-332	DEBIT	250000.00	Purchase against GRN: GRN-BBF-250202-332	\N	\N	\N	\N	2025-02-02 21:53:49.879563	\N
77	2025-02-02 22:19:22.092	1	GRN-BP-250202-413	DEBIT	1500000.00	Purchase against GRN: GRN-BP-250202-413	\N	\N	\N	\N	2025-02-02 22:19:22.090744	\N
78	2025-02-03 17:54:40.21	1	GRN-BP-250203-849	DEBIT	352000.00	Purchase against GRN: GRN-BP-250203-849	\N	\N	\N	\N	2025-02-03 17:54:40.179909	\N
79	2025-02-12 01:12:21.938	2	SO-AS-250212-380	CREDIT	98000.00	Sale against GRN: SO-AS-250212-380	\N	\N	\N	\N	2025-02-12 01:12:21.9291	\N
80	2025-02-20 15:20:56.179	1	GRN-BP-250220-370	DEBIT	40500.00	Purchase against GRN: GRN-BP-250220-370	\N	\N	\N	\N	2025-02-20 15:20:56.17169	\N
81	2025-03-02 15:15:30.545	1	GRN-BP-250302-515	DEBIT	426600.00	Purchase against GRN: GRN-BP-250302-515	\N	\N	\N	\N	2025-03-02 15:15:30.537938	\N
82	2025-03-04 14:48:25.333	2	PMT-1	CREDIT	10000.00	Payment issued via CASH	\N	\N	\N	\N	2025-03-04 14:50:26.333862	\N
83	2025-03-04 15:00:56.626	2	PMT-2	DEBIT	10000.00	Payment received from Ali via CASH	\N	\N	\N	\N	2025-03-04 15:01:23.300171	\N
84	2025-03-04 15:24:38.684	1	PMT-3	CREDIT	25000.00	Payment issued to ali via ONLINE	\N	\N	\N	\N	2025-03-04 15:24:55.392457	\N
85	2025-03-04 16:50:24.807	2	PMT-7	CREDIT	100.00	Payment issued to ali via CASH	\N	\N	\N	\N	2025-03-04 16:50:39.563288	\N
86	2025-03-04 16:57:50.729	1	PV202520250002	CREDIT	1000.00	Payment issued to ali via ONLINE	\N	\N	\N	\N	2025-03-04 16:58:08.119286	\N
87	2025-03-05 14:48:26.782	2	RV20250001	DEBIT	1000.00	Payment received from Fida via CASH	\N	\N	\N	\N	2025-03-05 14:48:45.835606	\N
88	2025-03-05 15:05:19.209	2	PV20250003	CREDIT	1000.00	Payment issued to ali via CASH	\N	\N	\N	\N	2025-03-05 15:05:34.921299	\N
89	2025-03-05 15:27:35.796	1	RV20250002	DEBIT	123.00	Payment received from ali via CASH	\N	\N	\N	\N	2025-03-05 15:27:48.478672	\N
90	2025-03-05 15:27:55.141	1	PV20250003	CREDIT	134.00	Payment issued to abid via CHEQUE	\N	\N	\N	\N	2025-03-05 15:28:10.450904	\N
91	2025-03-05 15:30:07.22	1	PV20250003	CREDIT	12345.00	Payment issued to asiuf via CASH	\N	\N	\N	\N	2025-03-05 15:30:22.801026	\N
92	2025-03-05 15:39:15.869	2	RV20250001	DEBIT	100.00	Payment received from ali via CASH	\N	\N	\N	\N	2025-03-05 15:39:33.615301	\N
93	2025-03-05 15:41:35.519	2	PV20250001	CREDIT	100.00	Payment issued to ali via CASH	\N	\N	\N	\N	2025-03-05 15:42:20.476142	\N
94	2025-03-05 15:42:23.753	1	RV20250001	DEBIT	123.00	Payment received from ali via CASH	\N	\N	\N	\N	2025-03-05 15:42:36.37816	\N
95	2025-03-05 15:43:53.485	1	PV20250002	CREDIT	157.00	Payment issued to ali via ONLINE	\N	\N	\N	\N	2025-03-05 15:44:07.85521	\N
96	2025-03-05 15:44:23.017	4	RV20250002	DEBIT	190.00	Payment received from ali via ONLINE	\N	\N	\N	\N	2025-03-05 15:44:34.970951	\N
97	2025-03-05 15:45:31.497	1	PV20250003	CREDIT	170.00	Payment issued to hamza via CASH	\N	\N	\N	\N	2025-03-05 15:45:45.314194	\N
98	2025-03-05 19:13:02.972	2	RV20250003	DEBIT	10000.00	Payment received from Adeel via CASH	\N	\N	\N	\N	2025-03-05 19:13:17.327152	\N
99	2025-03-05 19:14:34.482	1	PV20250004	CREDIT	100.00	Payment issued to fida via CASH	\N	\N	\N	\N	2025-03-05 19:14:49.98499	\N
100	2025-03-05 19:40:23.935	2	PV20250005	CREDIT	100.00	Payment issued to Adeel via CASH	\N	\N	\N	\N	2025-03-05 19:40:36.836145	\N
101	2025-03-05 19:40:58.636	2	RV20250004	DEBIT	100.00	Payment received from saman via CASH	\N	\N	\N	\N	2025-03-05 19:41:12.111917	\N
102	2025-03-09 16:04:32.523	1	GRN-BP-250307-306	DEBIT	487500.00	Purchase against GRN: GRN-BP-250307-306	\N	\N	\N	\N	2025-03-09 16:04:32.50345	\N
103	2025-03-12 17:26:57.444	1	PV20250006	CREDIT	100.00	Payment issued to Ali via CASH	\N	\N	\N	\N	2025-03-12 17:27:22.30644	\N
\.


--
-- Data for Name: workers_salary_totals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workers_salary_totals (id, month, year, total_amount, created_at) FROM stdin;
3	1	2025	1098081.00	2025-02-12 00:55:53.258389
4	12	2024	1108726.00	2025-02-15 17:08:07.041825
1	2	2025	1063274.00	2025-03-10 17:55:17.340575
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 5, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, false);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_transactions_id_seq', 1, false);


--
-- Name: cash_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_tracking_id_seq', 1, true);


--
-- Name: contractor_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractor_payments_id_seq', 1, false);


--
-- Name: contractor_salary_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractor_salary_history_id_seq', 15, true);


--
-- Name: contractors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractors_id_seq', 2, true);


--
-- Name: daily_attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_attendance_id_seq', 276, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 19, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 3, true);


--
-- Name: final_settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.final_settlements_id_seq', 1, false);


--
-- Name: gate_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_id_seq', 22, true);


--
-- Name: gate_entries_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_pricing_id_seq', 22, true);


--
-- Name: gate_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_returns_id_seq', 6, true);


--
-- Name: income_statement_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.income_statement_adjustments_id_seq', 18, true);


--
-- Name: leave_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_applications_id_seq', 2, true);


--
-- Name: loan_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_applications_id_seq', 4, true);


--
-- Name: loan_installments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_installments_id_seq', 12, true);


--
-- Name: maintenance_grn_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_grn_seq', 8, true);


--
-- Name: maintenance_issue_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_issue_items_id_seq', 34, true);


--
-- Name: maintenance_issues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_issues_id_seq', 21, true);


--
-- Name: monthly_price_averages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_price_averages_id_seq', 1, false);


--
-- Name: monthly_salary_totals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_salary_totals_id_seq', 3, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 59, true);


--
-- Name: pricing_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricing_entries_id_seq', 79, true);


--
-- Name: production_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_id_seq', 37, true);


--
-- Name: production_recipe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_recipe_id_seq', 33, true);


--
-- Name: production_reels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_reels_id_seq', 37, true);


--
-- Name: purchasers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchasers_id_seq', 2, true);


--
-- Name: salary_increments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_increments_id_seq', 4, true);


--
-- Name: salary_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_payments_id_seq', 14, true);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_adjustments_id_seq', 23, true);


--
-- Name: store_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_entries_id_seq', 114, true);


--
-- Name: store_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_items_id_seq', 9, true);


--
-- Name: store_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_returns_id_seq', 50, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 103, true);


--
-- Name: workers_salary_totals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workers_salary_totals_id_seq', 7, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: cash_tracking cash_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_tracking
    ADD CONSTRAINT cash_tracking_pkey PRIMARY KEY (id);


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
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


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
-- Name: income_statement_adjustments income_statement_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.income_statement_adjustments
    ADD CONSTRAINT income_statement_adjustments_pkey PRIMARY KEY (id);


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
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


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
-- Name: idx_bank_transactions_account_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_transactions_account_date ON public.bank_transactions USING btree (account_id, transaction_date);


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
-- Name: idx_payments_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_account_id ON public.payments USING btree (account_id);


--
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_payment_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_payment_type ON public.payments USING btree (payment_type);


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
-- Name: bank_transactions bank_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.bank_accounts(id);


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
-- Name: payments payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


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

