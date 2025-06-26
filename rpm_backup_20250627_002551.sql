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

--
-- Name: check_account_id_exists(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_account_id_exists() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.account_id
    ) THEN
        RAISE EXCEPTION 'Account ID % does not exist in any chart of accounts level', NEW.account_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_account_id_exists() OWNER TO postgres;

--
-- Name: check_chart_account_exists(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_chart_account_exists() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- For supplier_id (used in purchase entries)
    IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
    ) THEN
        RAISE EXCEPTION 'Supplier ID % does not exist in chart of accounts or is not a supplier', NEW.supplier_id;
    END IF;

    -- For purchaser_id (used in sale entries)
    IF NEW.purchaser_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
    ) THEN
        RAISE EXCEPTION 'Customer ID % does not exist in chart of accounts or is not a customer', NEW.purchaser_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_chart_account_exists() OWNER TO postgres;

--
-- Name: check_chart_account_exists_pricing(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_chart_account_exists_pricing() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.account_id
    ) THEN
        RAISE EXCEPTION 'Account ID % does not exist in chart of accounts', NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_chart_account_exists_pricing() OWNER TO postgres;

--
-- Name: update_bank_balance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_bank_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.type = 'CREDIT' THEN
        UPDATE bank_accounts 
        SET current_balance = current_balance + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.account_id;
    ELSE
        UPDATE bank_accounts 
        SET current_balance = current_balance - NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.account_id;
    END IF;
    
    -- Update balance_after in the transaction
    NEW.balance_after := (
        SELECT current_balance 
        FROM bank_accounts 
        WHERE id = NEW.account_id
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_bank_balance() OWNER TO postgres;

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
    chart_account_id integer,
    chart_account_level integer DEFAULT 1,
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_number character varying(50),
    branch_name character varying(100),
    ifsc_code character varying(20),
    opening_balance numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) DEFAULT 0,
    account_type character varying(20),
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    balance numeric(15,2) DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bank_accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SAVINGS'::character varying, 'CURRENT'::character varying, 'CC'::character varying, 'OD'::character varying])::text[]))),
    CONSTRAINT bank_accounts_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying])::text[])))
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
    balance_after numeric(15,2),
    remarks text,
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
-- Name: cash_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_transactions (
    id integer NOT NULL,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type character varying(10),
    amount numeric(15,2) NOT NULL,
    reference character varying(100),
    remarks text,
    balance numeric(15,2) NOT NULL,
    balance_after numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cash_transactions_type_check CHECK (((type)::text = ANY ((ARRAY['CREDIT'::character varying, 'DEBIT'::character varying])::text[])))
);


ALTER TABLE public.cash_transactions OWNER TO postgres;

--
-- Name: cash_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cash_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cash_transactions_id_seq OWNER TO postgres;

--
-- Name: cash_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cash_transactions_id_seq OWNED BY public.cash_transactions.id;


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    account_type character varying(50),
    level1_id integer,
    level2_id integer,
    level3_id integer,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chart_of_accounts OWNER TO postgres;

--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chart_of_accounts_id_seq OWNER TO postgres;

--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chart_of_accounts_id_seq OWNED BY public.chart_of_accounts.id;


--
-- Name: chart_of_accounts_level1; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts_level1 (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0,
    balance_type character varying(10),
    account_type character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chart_of_accounts_level1_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_level1_balance_type_check CHECK (((balance_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.chart_of_accounts_level1 OWNER TO postgres;

--
-- Name: chart_of_accounts_level1_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chart_of_accounts_level1_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chart_of_accounts_level1_id_seq OWNER TO postgres;

--
-- Name: chart_of_accounts_level1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chart_of_accounts_level1_id_seq OWNED BY public.chart_of_accounts_level1.id;


--
-- Name: chart_of_accounts_level2; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts_level2 (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0,
    balance_type character varying(10),
    account_type character varying(10),
    level1_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chart_of_accounts_level2_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_level2_balance_type_check CHECK (((balance_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.chart_of_accounts_level2 OWNER TO postgres;

--
-- Name: chart_of_accounts_level2_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chart_of_accounts_level2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chart_of_accounts_level2_id_seq OWNER TO postgres;

--
-- Name: chart_of_accounts_level2_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chart_of_accounts_level2_id_seq OWNED BY public.chart_of_accounts_level2.id;


--
-- Name: chart_of_accounts_level3; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chart_of_accounts_level3 (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0,
    balance_type character varying(10),
    account_type character varying(10),
    level1_id integer,
    level2_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chart_of_accounts_level3_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_level3_balance_type_check CHECK (((balance_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.chart_of_accounts_level3 OWNER TO postgres;

--
-- Name: chart_of_accounts_level3_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chart_of_accounts_level3_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chart_of_accounts_level3_id_seq OWNER TO postgres;

--
-- Name: chart_of_accounts_level3_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chart_of_accounts_level3_id_seq OWNED BY public.chart_of_accounts_level3.id;


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
-- Name: expense_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_types OWNER TO postgres;

--
-- Name: expense_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_types_id_seq OWNER TO postgres;

--
-- Name: expense_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_types_id_seq OWNED BY public.expense_types.id;


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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    voucher_no character varying(20),
    created_by integer,
    processed_by_role character varying(50),
    account_id integer,
    account_type character varying(50)
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
    has_freight boolean DEFAULT false,
    freight_amount numeric(10,2) DEFAULT 0,
    freight boolean DEFAULT false,
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
    final_quantity numeric(10,2),
    cut_weight numeric(10,2) DEFAULT 0,
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
-- Name: item_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.item_types OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.item_types_id_seq OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_types_id_seq OWNED BY public.item_types.id;


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
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    account_id integer NOT NULL,
    debit_amount numeric(10,2) DEFAULT 0,
    credit_amount numeric(10,2) DEFAULT 0,
    description text,
    voucher_no character varying(20),
    created_by integer,
    processed_by_role character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_type character varying(50)
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ledger_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_entries_id_seq OWNER TO postgres;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ledger_entries_id_seq OWNED BY public.ledger_entries.id;


--
-- Name: ledgers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledgers (
    id integer NOT NULL,
    account_id integer NOT NULL,
    account_type character varying(10),
    opening_balance numeric(15,2) DEFAULT 0.00,
    balance_type character varying(10),
    amount numeric(15,2) DEFAULT 0.00,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ledgers_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['LEVEL1'::character varying, 'LEVEL2'::character varying, 'LEVEL3'::character varying])::text[]))),
    CONSTRAINT ledgers_balance_type_check CHECK (((balance_type)::text = ANY ((ARRAY['DEBIT'::character varying, 'CREDIT'::character varying])::text[])))
);


ALTER TABLE public.ledgers OWNER TO postgres;

--
-- Name: ledgers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ledgers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledgers_id_seq OWNER TO postgres;

--
-- Name: ledgers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ledgers_id_seq OWNED BY public.ledgers.id;


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
-- Name: paper_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paper_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.paper_types OWNER TO postgres;

--
-- Name: paper_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paper_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paper_types_id_seq OWNER TO postgres;

--
-- Name: paper_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paper_types_id_seq OWNED BY public.paper_types.id;


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
    processed_by_role character varying(20),
    bank_account_id integer
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
    CONSTRAINT pricing_entries_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('PURCHASE'::character varying)::text, ('SALE'::character varying)::text, ('PURCHASE_RETURN'::character varying)::text, ('SALE_RETURN'::character varying)::text, ('STORE_PURCHASE'::character varying)::text, ('STORE_RETURN'::character varying)::text]))),
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
    CONSTRAINT production_paper_type_check CHECK (((paper_type)::text = ANY (ARRAY['Super'::text])))
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
-- Name: production_paper_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.production_paper_types (
    id integer NOT NULL,
    production_id integer,
    paper_type character varying(50) NOT NULL,
    total_weight numeric(10,2) NOT NULL,
    boiler_fuel_cost numeric(10,2) DEFAULT 0,
    electricity_cost numeric(10,2) DEFAULT 0
);


ALTER TABLE public.production_paper_types OWNER TO postgres;

--
-- Name: production_paper_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.production_paper_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.production_paper_types_id_seq OWNER TO postgres;

--
-- Name: production_paper_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.production_paper_types_id_seq OWNED BY public.production_paper_types.id;


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
    grn_number character varying(50) NOT NULL,
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
    CONSTRAINT store_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['STORE_IN'::character varying, 'STORE_OUT'::character varying])::text[])))
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
-- Name: cash_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions ALTER COLUMN id SET DEFAULT nextval('public.cash_transactions_id_seq'::regclass);


--
-- Name: chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_id_seq'::regclass);


--
-- Name: chart_of_accounts_level1 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level1 ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_level1_id_seq'::regclass);


--
-- Name: chart_of_accounts_level2 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level2 ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_level2_id_seq'::regclass);


--
-- Name: chart_of_accounts_level3 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3 ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_level3_id_seq'::regclass);


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
-- Name: expense_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_types ALTER COLUMN id SET DEFAULT nextval('public.expense_types_id_seq'::regclass);


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
-- Name: item_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types ALTER COLUMN id SET DEFAULT nextval('public.item_types_id_seq'::regclass);


--
-- Name: leave_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications ALTER COLUMN id SET DEFAULT nextval('public.leave_applications_id_seq'::regclass);


--
-- Name: ledger_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN id SET DEFAULT nextval('public.ledger_entries_id_seq'::regclass);


--
-- Name: ledgers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledgers ALTER COLUMN id SET DEFAULT nextval('public.ledgers_id_seq'::regclass);


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
-- Name: paper_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_types ALTER COLUMN id SET DEFAULT nextval('public.paper_types_id_seq'::regclass);


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
-- Name: production_paper_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_paper_types ALTER COLUMN id SET DEFAULT nextval('public.production_paper_types_id_seq'::regclass);


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

COPY public.accounts (id, account_name, account_type, contact_person, phone, email, address, opening_balance, current_balance, created_at, chart_account_id, chart_account_level) FROM stdin;
4	SMS	CUSTOMER	\N	\N	\N	\N	0.00	1157300.00	2025-06-15 16:18:19.536522	4	1
5	RS	CUSTOMER	\N	\N	\N	\N	0.00	2568400.00	2025-06-20 18:12:19.651306	5	1
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, bank_name, account_name, created_at, account_number, branch_name, ifsc_code, opening_balance, current_balance, account_type, status, updated_at, balance, last_updated) FROM stdin;
1	Meezan		2025-06-13 17:33:30.434645	12345678			0.00	20900.00	CURRENT	ACTIVE	2025-06-14 14:57:27.158506	0.00	2025-06-13 17:33:30.434645
\.


--
-- Data for Name: bank_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_transactions (id, account_id, transaction_date, description, reference, type, amount, balance, created_at, balance_after, remarks) FROM stdin;
1	1	2025-06-14 14:25:29.37	\N	RV20250011	CREDIT	10000.00	0.00	2025-06-14 14:25:46.228193	10000.00	Payment from Bhatti
2	1	2025-06-14 14:28:15.354	\N	RV20250012	CREDIT	15000.00	10000.00	2025-06-14 14:28:27.349044	25000.00	Payment from sajjad
3	1	2025-06-14 14:37:19.031	\N	PV20250003	DEBIT	1000.00	25000.00	2025-06-14 14:37:33.943944	24000.00	Payment to bhatti
4	1	2025-06-14 14:55:26.510352	\N	Cash Withdrawal	DEBIT	4000.00	24000.00	2025-06-14 14:55:26.510352	20000.00	\N
5	1	2025-06-14 14:56:33.95	\N	PV20250004	DEBIT	100.00	20000.00	2025-06-14 14:56:48.342664	19900.00	Payment to ali
6	1	2025-06-14 14:57:27.158506	\N	Cash Deposit	CREDIT	1000.00	19900.00	2025-06-14 14:57:27.158506	20900.00	\N
\.


--
-- Data for Name: cash_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_tracking (id, cash_in_hand, cash_in_bank, last_updated) FROM stdin;
1	32610.00	0.00	2025-06-14 14:57:27.158506
\.


--
-- Data for Name: cash_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_transactions (id, transaction_date, type, amount, reference, remarks, balance, balance_after, created_at) FROM stdin;
1	2025-06-13 16:52:24.614962	CREDIT	10000.00	RV20250001	Payment from Adeel	0.00	10000.00	2025-06-13 16:52:24.614962
2	2025-06-13 16:59:54.07331	CREDIT	10000.00	RV20250002	Payment from Adeel	10000.00	20000.00	2025-06-13 16:59:54.07331
5	2025-06-13 17:09:31.777	CREDIT	4000.00	RV20250004	Payment from ali	20000.00	24000.00	2025-06-13 17:21:06.026897
6	2025-06-13 17:22:44.672	CREDIT	1000.00	RV20250005	Payment from ALI	24000.00	25000.00	2025-06-13 17:22:56.706735
7	2025-06-13 19:48:17.787	CREDIT	1000.00	RV20250006	Payment from Murtaza	25000.00	26000.00	2025-06-13 19:48:28.644686
8	2025-06-13 19:48:28.697	CREDIT	500.00	RV20250007	Payment from Murtaza	26000.00	26500.00	2025-06-13 19:57:52.189041
9	2025-06-13 21:54:17.758	CREDIT	1700.00	RV20250008	Payment from abid	26500.00	28200.00	2025-06-13 21:54:33.211664
10	2025-06-13 21:55:32.439	CREDIT	1600.00	RV20250009	Payment from ali	28200.00	29800.00	2025-06-13 21:55:47.451451
11	2025-06-14 13:58:52.918	CREDIT	1000.00	RV20250010	Payment from ali	29800.00	30800.00	2025-06-14 13:59:06.404662
12	2025-06-14 14:34:09.796	DEBIT	1000.00	PV20250001	Payment to bhatti	30800.00	29800.00	2025-06-14 14:34:30.149554
13	2025-06-14 14:36:52.738	DEBIT	190.00	PV20250002	Payment to ali	29800.00	29610.00	2025-06-14 14:37:06.651611
14	2025-06-14 14:55:26.510352	CREDIT	4000.00	Bank Withdrawal	Cash Withdrawal	29610.00	33610.00	2025-06-14 14:55:26.510352
15	2025-06-14 14:57:27.158506	DEBIT	1000.00	Bank Deposit	Cash Deposit	33610.00	32610.00	2025-06-14 14:57:27.158506
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts (id, name, account_type, level1_id, level2_id, level3_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chart_of_accounts_level1; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level1 (id, name, opening_balance, balance_type, account_type, created_at, updated_at) FROM stdin;
1	RECEIVABLE	0.00	DEBIT	ACCOUNT	2025-06-03 13:53:37.223122	2025-06-03 13:53:37.223122
2	Expense	0.00	DEBIT	ACCOUNT	2025-06-03 13:54:36.540159	2025-06-03 13:54:36.540159
3	Customer	0.00	DEBIT	ACCOUNT	2025-06-13 16:50:58.927367	2025-06-13 16:50:58.927367
4	Payable	0.00	DEBIT	ACCOUNT	2025-06-20 17:20:53.238154	2025-06-20 17:20:53.238154
\.


--
-- Data for Name: chart_of_accounts_level2; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level2 (id, name, opening_balance, balance_type, account_type, level1_id, created_at, updated_at) FROM stdin;
1	Raddi 	0.00	DEBIT	ACCOUNT	1	2025-06-03 13:54:07.787659	2025-06-03 13:54:07.787659
2	Petrol	0.00	DEBIT	ACCOUNT	2	2025-06-03 13:54:46.075782	2025-06-03 13:54:46.075782
3	Paper	0.00	DEBIT	ACCOUNT	3	2025-06-13 16:51:19.302187	2025-06-13 16:51:19.302187
4	Store	0.00	DEBIT	ACCOUNT	4	2025-06-20 17:21:08.129658	2025-06-20 17:21:08.129658
\.


--
-- Data for Name: chart_of_accounts_level3; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level3 (id, name, opening_balance, balance_type, account_type, level1_id, level2_id, created_at, updated_at) FROM stdin;
1	Sajjad	0.00	DEBIT	ACCOUNT	1	1	2025-06-03 13:54:16.65937	2025-06-03 13:54:16.65937
2	Sajjad1	0.00	DEBIT	SUPPLIER	1	1	2025-06-03 13:54:28.30691	2025-06-03 13:54:28.30691
3	Mahmood	0.00	DEBIT	ACCOUNT	3	3	2025-06-13 16:51:33.00579	2025-06-13 16:51:33.00579
4	SMS	0.00	DEBIT	CUSTOMER	3	3	2025-06-13 16:52:00.565438	2025-06-13 16:52:00.565438
5	RS	0.00	DEBIT	CUSTOMER	3	3	2025-06-13 21:54:14.599429	2025-06-13 21:54:14.599429
6	Murtaza	0.00	DEBIT	VENDOR	4	4	2025-06-20 17:21:24.360015	2025-06-20 17:21:24.360015
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
\.


--
-- Data for Name: contractors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractors (id, name, monthly_salary, status, created_at) FROM stdin;
1	Load/Unload Contractor	500000.00	ACTIVE	2025-06-03 13:56:48.338784
2	Rewinder Contractor	500000.00	ACTIVE	2025-06-03 13:56:48.338784
\.


--
-- Data for Name: daily_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_attendance (id, employee_id, attendance_date, status, in_time, out_time, overtime, remarks, created_at, salary_for_day, hours_worked, standard_hours) FROM stdin;
1	25GATE2681	2025-06-16	Present	07:00:00	19:00:00	0.00		2025-06-16 15:25:02.237201	0.00	12.00	12
2	25GATE2681	2025-06-20	Present	07:00:00	19:00:00	0.00		2025-06-20 18:00:40.605971	0.00	12.00	12
3	25GATE2681	2025-06-19	Present	07:00:00	19:00:00	0.00		2025-06-20 18:01:04.172977	0.00	12.00	12
4	25GATE2681	2025-06-18	Present	07:00:00	19:00:00	0.00		2025-06-20 18:01:08.668086	0.00	12.00	12
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, code, created_at) FROM stdin;
1	Machine Hall	MAH	2025-06-03 13:56:36.965796
2	Mechanical	MECH	2025-06-03 13:56:36.965796
3	Laboratory	LAB	2025-06-03 13:56:36.965796
4	Store	STORE	2025-06-03 13:56:36.965796
5	Administration	ADMIN	2025-06-03 13:56:36.965796
6	Electrical	ELEC	2025-06-03 13:56:36.965796
7	Gate	GATE	2025-06-03 13:56:36.965796
8	Pulp Section	PULP	2025-06-03 13:56:36.965796
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, first_name, last_name, department_id, designation, joining_date, salary, phone, status, created_at, termination_date, separation_type, due_salary, emergency_contact_name, emergency_contact_phone) FROM stdin;
25GATE2681	Ali	Rehman	7	Security	2025-06-16	25000.00	013245	ACTIVE	2025-06-16 15:24:45.685841	\N	\N	0.00	0321456	0321456
\.


--
-- Data for Name: expense_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_types (id, name, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, date, expense_type, amount, receiver_name, remarks, created_at, voucher_no, created_by, processed_by_role, account_id, account_type) FROM stdin;
\.


--
-- Data for Name: final_settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.final_settlements (id, employee_id, separation_type, last_working_date, due_salary, loan_deductions, advance_deductions, net_settlement, created_at) FROM stdin;
\.


--
-- Data for Name: gate_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_entries (id, grn_number, entry_type, supplier_id, purchaser_id, vehicle_type, vehicle_number, driver_name, item_type, paper_type, quantity, unit, date_time, remarks, created_at, has_freight, freight_amount, freight) FROM stdin;
4	GRN-SP-250614-357	PURCHASE_IN	2	\N	\N	123	Arif	Petti	\N	10000.00	KG	2025-06-14 10:01:00.293	Supplier Qty: 10000, Received Qty: 10000, 	2025-06-14 15:01:37.932838	f	0.00	f
5	GRN-SP-250614-326	PURCHASE_IN	2	\N	\N	123	Arif	Petti	\N	10000.00	KG	2025-06-14 10:01:39.134	Supplier Qty: 10000, Received Qty: 10000, 	2025-06-14 15:08:29.995821	f	0.00	f
6	GRN-SP-250614-670	PURCHASE_IN	2	\N	\N	ROHAN	Arif	Petti	\N	5000.00	KG	2025-06-14 10:08:31.021	Supplier Qty: 5000, Received Qty: 5000, 	2025-06-14 15:09:14.860626	f	0.00	f
7	GRN-SP-250615-963	PURCHASE_IN	2	\N	\N	123	Arif	Petti	\N	5000.00	KG	2025-06-15 10:28:43.196	Supplier Qty: 5000, Received Qty: 5000, 	2025-06-15 15:28:58.562909	f	0.00	f
8	GRN-SDM-250615-088	PURCHASE_IN	2	\N	\N	123	Arif	Dabbi Mix	\N	10000.00	KG	2025-06-15 10:28:59.397	Supplier Qty: 30000, Received Qty: 10000, 	2025-06-15 15:33:37.203336	f	0.00	f
9	GRN-SBF-250615-013	PURCHASE_IN	2	\N	\N	123	Arif	Boiler Fuel (Toori)	\N	25000.00	KG	2025-06-15 10:33:38.569	Supplier Qty: 25000, Received Qty: 25000, 	2025-06-15 15:35:45.704041	f	0.00	f
12	SO-SS-250615-953	SALE_OUT	\N	4	Mazda	123	arif	\N	Super	10000.00	KG	2025-06-15 11:13:49.975		2025-06-15 16:18:19.536522	f	0.00	f
13	GRN-SP-250616-307	PURCHASE_IN	2	\N	\N	123	ali	Petti	\N	9700.00	KG	2025-06-16 10:29:33.411	Supplier Qty: 10000, Received Qty: 9700, 	2025-06-16 15:31:18.221228	f	0.00	f
14	SO-RS-250620-419	SALE_OUT	\N	5	Mazda	123	PETR	\N	Super	10000.00	KG	2025-06-20 13:06:12.408		2025-06-20 18:12:19.651306	t	15000.00	f
15	SO-RS-250620-894	SALE_OUT	\N	5	Mazda	123	PETR	\N	Super	1000.00	KG	2025-06-20 13:12:20.816		2025-06-20 18:15:23.435298	t	10000.00	f
16	SO-RS-250620-660	SALE_OUT	\N	5	Mazda	123	PETR	\N	Super	1000.00	KG	2025-06-20 13:15:24.576		2025-06-20 18:17:16.321514	t	1000.00	f
17	SO-RS-250620-119	SALE_OUT	\N	5	Mazda	123	PETR	\N	Super	1000.00	KG	2025-06-20 13:17:17.256		2025-06-20 18:22:42.112595	t	1000.00	f
19	SO-RS-250620-502	SALE_OUT	\N	5	Mazda	123	ade	\N	Super	1000.00	KG	2025-06-20 13:27:51.98		2025-06-20 18:28:12.878112	t	1000.00	f
20	SO-RS-250620-795	SALE_OUT	\N	5	Mazda	1000	ali	\N	Super	2500.00	KG	2025-06-20 13:28:14.128		2025-06-20 18:31:29.200976	t	1000.00	f
21	SO-SS-250620-668	SALE_OUT	\N	4	Mazda	123	ale	\N	Super	1000.00	KG	2025-06-20 13:33:01.408		2025-06-20 18:33:21.749387	f	0.00	f
22	SO-RS-250620-499	SALE_OUT	\N	5	Mazda	123	sajjad	\N	Super	1200.00	KG	2025-06-20 13:42:10.311		2025-06-20 19:39:17.428276	f	1900.00	t
23	SO-RS-250620-279	SALE_OUT	\N	5	Mazda	123	sajjad	\N	Super	1000.00	KG	2025-06-20 14:39:19.385		2025-06-20 19:40:40.198182	f	1000.00	t
24	SO-RS-250620-506	SALE_OUT	\N	5	Mazda	123	MAHM	\N	Super	1200.00	KG	2025-06-20 14:50:30.407		2025-06-20 19:52:04.962906	f	0.00	f
25	SO-SS-250620-497	SALE_OUT	\N	4	Mazda	123	MAHM	\N	Super	1700.00	KG	2025-06-20 14:52:05.857		2025-06-20 19:55:06.841919	f	0.00	f
26	SO-RS-250620-319	SALE_OUT	\N	5	Mazda	123	MAHM	\N	Super	1000.00	KG	2025-06-20 14:55:07.802		2025-06-20 19:57:03.052266	f	0.00	f
27	SO-RS-250620-207	SALE_OUT	\N	5	Mazda	123	MAHM	\N	Super	1000.00	KG	2025-06-20 14:57:04.049		2025-06-20 19:58:38.87321	f	0.00	f
28	SO-RS-250621-699	SALE_OUT	\N	5	Mazda	123	adeel	\N	Super	1000.00	KG	2025-06-21 10:14:38.691		2025-06-21 15:14:57.018918	f	0.00	f
29	SO-RS-250621-428	SALE_OUT	\N	5	Mazda	123	123	\N	Super	1000.00	KG	2025-06-21 10:14:58.148		2025-06-21 15:19:28.056377	f	0.00	f
30	SO-RS-250621-247	SALE_OUT	\N	5	Mazda	123	adeel	\N	Super	1900.00	KG	2025-06-21 10:19:29.068		2025-06-21 15:23:08.509487	f	0.00	f
31	SO-RS-250621-842	SALE_OUT	\N	5	Mazda	ADEEL	adeel	\N	Super	1000.00	KG	2025-06-21 10:23:09.484		2025-06-21 15:29:10.983611	f	0.00	f
\.


--
-- Data for Name: gate_entries_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_entries_pricing (id, entry_type, grn_number, account_id, item_id, quantity, price_per_unit, total_amount, status, processed_at, created_at, final_quantity, cut_weight, processed_by_role) FROM stdin;
4	PURCHASE	GRN-SP-250614-670	2	\N	5000.00	50.00	250000.00	PROCESSED	2025-06-14 15:11:37.010632	2025-06-14 15:09:14.860626	5000.00	0.00	ACCOUNTS
3	PURCHASE	GRN-SP-250614-326	2	\N	10000.00	50.00	500000.00	PROCESSED	2025-06-14 15:20:31.390868	2025-06-14 15:08:29.995821	10000.00	0.00	ACCOUNTS
2	PURCHASE	GRN-SP-250614-357	2	\N	10000.00	50.00	500000.00	PROCESSED	2025-06-15 15:26:29.061551	2025-06-14 15:01:37.932838	10000.00	0.00	ACCOUNTS
5	PURCHASE	GRN-SP-250615-963	2	\N	5000.00	55.00	275000.00	PROCESSED	2025-06-15 15:29:19.229086	2025-06-15 15:28:58.562909	5000.00	0.00	ACCOUNTS
6	PURCHASE	GRN-SDM-250615-088	2	\N	10000.00	33.00	330000.00	PROCESSED	2025-06-15 15:33:47.706454	2025-06-15 15:33:37.203336	10000.00	0.00	ACCOUNTS
7	PURCHASE	GRN-SBF-250615-013	2	\N	25000.00	15.00	375000.00	PROCESSED	2025-06-15 15:35:58.399577	2025-06-15 15:35:45.704041	25000.00	0.00	ACCOUNTS
8	SALE	SO-SS-250615-953	4	\N	10000.00	91.00	910000.00	PROCESSED	2025-06-15 16:18:39.287332	2025-06-15 16:18:19.536522	10000.00	0.00	ACCOUNTS
9	PURCHASE	GRN-SP-250616-307	2	\N	9700.00	50.00	482500.00	PROCESSED	2025-06-16 15:32:52.941868	2025-06-16 15:31:18.221228	9650.00	50.00	ACCOUNTS
10	SALE	SO-RS-250620-419	5	\N	10000.00	91.00	910000.00	PROCESSED	2025-06-20 18:12:30.950824	2025-06-20 18:12:19.651306	10000.00	0.00	ACCOUNTS
11	SALE	SO-RS-250620-894	5	\N	1000.00	91.00	91000.00	PROCESSED	2025-06-20 18:15:30.789756	2025-06-20 18:15:23.435298	1000.00	0.00	ACCOUNTS
12	SALE	SO-RS-250620-660	5	\N	1000.00	91.00	91000.00	PROCESSED	2025-06-20 18:21:17.197287	2025-06-20 18:17:16.321514	1000.00	0.00	ACCOUNTS
13	SALE	SO-RS-250620-119	5	\N	1000.00	92.00	92000.00	PROCESSED	2025-06-20 18:22:52.31736	2025-06-20 18:22:42.112595	1000.00	0.00	ACCOUNTS
14	SALE	SO-RS-250620-502	5	\N	1000.00	94.00	94000.00	PROCESSED	2025-06-20 18:28:20.333626	2025-06-20 18:28:12.878112	1000.00	0.00	ACCOUNTS
15	SALE	SO-RS-250620-795	5	\N	2500.00	98.00	245000.00	PROCESSED	2025-06-20 18:31:35.76641	2025-06-20 18:31:29.200976	2500.00	0.00	ACCOUNTS
16	SALE	SO-SS-250620-668	4	\N	1000.00	95.00	95000.00	PROCESSED	2025-06-20 18:33:31.06992	2025-06-20 18:33:21.749387	1000.00	0.00	ACCOUNTS
17	SALE	SO-RS-250620-499	5	\N	1200.00	95.00	114000.00	PROCESSED	2025-06-20 19:39:43.352118	2025-06-20 19:39:17.428276	1200.00	0.00	ACCOUNTS
18	SALE	SO-RS-250620-279	5	\N	1000.00	100.00	100000.00	PROCESSED	2025-06-20 19:40:50.182672	2025-06-20 19:40:40.198182	1000.00	0.00	ACCOUNTS
19	SALE	SO-RS-250620-506	5	\N	1200.00	95.00	114000.00	PROCESSED	2025-06-20 19:52:27.974805	2025-06-20 19:52:04.962906	1200.00	0.00	ACCOUNTS
20	SALE	SO-SS-250620-497	4	\N	1700.00	89.00	151300.00	PROCESSED	2025-06-20 19:55:16.551577	2025-06-20 19:55:06.841919	1700.00	0.00	ACCOUNTS
21	SALE	SO-RS-250620-319	5	\N	1000.00	100.00	100000.00	PROCESSED	2025-06-20 19:57:13.735087	2025-06-20 19:57:03.052266	1000.00	0.00	ACCOUNTS
22	SALE	SO-RS-250620-207	5	\N	1000.00	100.00	100000.00	PROCESSED	2025-06-20 19:58:52.919629	2025-06-20 19:58:38.87321	1000.00	0.00	ACCOUNTS
23	SALE	SO-RS-250621-699	5	\N	1000.00	98.00	98000.00	PROCESSED	2025-06-21 15:15:04.194855	2025-06-21 15:14:57.018918	1000.00	0.00	ACCOUNTS
24	SALE	SO-RS-250621-428	5	\N	1000.00	99.00	99000.00	PROCESSED	2025-06-21 15:19:43.395021	2025-06-21 15:19:28.056377	1000.00	0.00	ACCOUNTS
25	SALE	SO-RS-250621-247	5	\N	1900.00	100.00	190000.00	PROCESSED	2025-06-21 15:23:21.210771	2025-06-21 15:23:08.509487	1900.00	0.00	ACCOUNTS
26	SALE	SO-RS-250621-842	5	\N	1000.00	100.00	100000.00	PROCESSED	2025-06-21 15:29:25.87527	2025-06-21 15:29:10.983611	1000.00	0.00	ACCOUNTS
\.


--
-- Data for Name: gate_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_returns (id, return_number, original_grn_number, return_type, return_quantity, return_reason, vehicle_type, vehicle_number, driver_name, date_time, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: income_statement_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.income_statement_adjustments (id, month, year, category, adjustment_amount, current_value, new_value, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: item_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item_types (id, name, description, created_at) FROM stdin;
1	Petti		2025-06-14 14:43:40.841877
2	Dabbi Mix		2025-06-15 15:33:22.446723
3	Boiler Fuel (Toori)		2025-06-15 15:35:28.111098
\.


--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_applications (id, employee_id, start_date, end_date, reason, leave_with_pay, status, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, date, account_id, debit_amount, credit_amount, description, voucher_no, created_by, processed_by_role, created_at, account_type) FROM stdin;
\.


--
-- Data for Name: ledgers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledgers (id, account_id, account_type, opening_balance, balance_type, amount, transaction_date, created_at, updated_at) FROM stdin;
3	1	LEVEL3	0.00	DEBIT	0.00	2025-06-03 13:54:16.65937	2025-06-03 13:54:16.65937	2025-06-03 13:54:16.65937
4	2	LEVEL3	0.00	DEBIT	0.00	2025-06-03 13:54:28.30691	2025-06-03 13:54:28.30691	2025-06-03 13:54:28.30691
2	1	LEVEL2	0.00	DEBIT	0.00	2025-06-03 13:54:07.787659	2025-06-03 13:54:07.787659	2025-06-03 13:54:07.787659
1	1	LEVEL1	0.00	DEBIT	0.00	2025-06-03 13:53:37.223122	2025-06-03 13:53:37.223122	2025-06-03 13:53:37.223122
6	2	LEVEL2	0.00	DEBIT	0.00	2025-06-03 13:54:46.075782	2025-06-03 13:54:46.075782	2025-06-03 13:54:46.075782
5	2	LEVEL1	0.00	DEBIT	0.00	2025-06-03 13:54:36.540159	2025-06-03 13:54:36.540159	2025-06-03 13:54:36.540159
9	3	LEVEL3	0.00	DEBIT	0.00	2025-06-13 16:51:33.00579	2025-06-13 16:51:33.00579	2025-06-13 16:51:33.00579
10	4	LEVEL3	0.00	DEBIT	0.00	2025-06-13 16:52:00.565438	2025-06-13 16:52:00.565438	2025-06-13 16:52:00.565438
11	5	LEVEL3	0.00	DEBIT	0.00	2025-06-13 21:54:14.599429	2025-06-13 21:54:14.599429	2025-06-13 21:54:14.599429
8	3	LEVEL2	0.00	DEBIT	0.00	2025-06-13 16:51:19.302187	2025-06-13 16:51:19.302187	2025-06-13 16:51:19.302187
7	3	LEVEL1	0.00	DEBIT	0.00	2025-06-13 16:50:58.927367	2025-06-13 16:50:58.927367	2025-06-13 16:50:58.927367
14	6	LEVEL3	0.00	DEBIT	0.00	2025-06-20 17:21:24.360015	2025-06-20 17:21:24.360015	2025-06-20 17:21:24.360015
13	4	LEVEL2	0.00	DEBIT	0.00	2025-06-20 17:21:08.129658	2025-06-20 17:21:08.129658	2025-06-20 17:21:08.129658
12	4	LEVEL1	0.00	DEBIT	0.00	2025-06-20 17:20:53.238154	2025-06-20 17:20:53.238154	2025-06-20 17:20:53.238154
\.


--
-- Data for Name: loan_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_applications (id, employee_id, loan_type, amount, installments, start_month, end_month, monthly_installment, status, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: loan_installments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loan_installments (id, loan_application_id, installment_date, amount, paid, paid_date, created_at) FROM stdin;
\.


--
-- Data for Name: maintenance_issue_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_issue_items (id, issue_id, item_code, quantity, unit_price, created_at) FROM stdin;
3	3	B597	2	1000.00	2025-06-20 17:52:15.887661
\.


--
-- Data for Name: maintenance_issues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_issues (id, department_code, issue_date, created_at) FROM stdin;
3	MAH	2025-06-20	2025-06-20 17:52:15.887661
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
1	6	2025	0.00	2025-06-20	PAID
\.


--
-- Data for Name: paper_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_types (id, name, description, created_at) FROM stdin;
1	Super		2025-06-15 15:30:26.332555
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, payment_date, payment_mode, account_id, account_type, amount, payment_type, remarks, created_at, receiver_name, voucher_no, is_tax_payment, created_by, processed_by_role, bank_account_id) FROM stdin;
1	2025-06-13 16:52:02.95	CASH	4	CUSTOMER	10000.00	RECEIVED		2025-06-13 16:52:24.614962	Adeel	RV20250001	f	\N	ACCOUNTS	\N
2	2025-06-13 16:59:32.668	CASH	4	CUSTOMER	10000.00	RECEIVED		2025-06-13 16:59:54.07331	Adeel	RV20250002	f	\N	ACCOUNTS	\N
3	2025-06-13 17:06:24.867		4	CUSTOMER	5000.00	RECEIVED		2025-06-13 17:09:31.756389	ali	RV20250003	f	\N	ACCOUNTS	\N
6	2025-06-13 17:09:31.777	CASH	4	CUSTOMER	4000.00	RECEIVED		2025-06-13 17:21:06.026897	ali	RV20250004	f	\N	ACCOUNTS	\N
7	2025-06-13 17:22:44.672	CASH	4	CUSTOMER	1000.00	RECEIVED		2025-06-13 17:22:56.706735	ALI	RV20250005	f	\N	ACCOUNTS	\N
8	2025-06-13 19:48:17.787	CASH	4	CUSTOMER	1000.00	RECEIVED		2025-06-13 19:48:28.644686	Murtaza	RV20250006	f	\N	ACCOUNTS	\N
9	2025-06-13 19:48:28.697	CASH	4	CUSTOMER	500.00	RECEIVED		2025-06-13 19:57:52.189041	Murtaza	RV20250007	f	\N	ACCOUNTS	\N
10	2025-06-13 21:54:17.758	CASH	5	CUSTOMER	1700.00	RECEIVED		2025-06-13 21:54:33.211664	abid	RV20250008	f	\N	ACCOUNTS	\N
11	2025-06-13 21:55:32.439	CASH	4	CUSTOMER	1600.00	RECEIVED		2025-06-13 21:55:47.451451	ali	RV20250009	f	\N	ACCOUNTS	\N
12	2025-06-14 13:58:52.918	CASH	5	CUSTOMER	1000.00	RECEIVED		2025-06-14 13:59:06.404662	ali	RV20250010	f	\N	ACCOUNTS	\N
13	2025-06-14 14:25:29.37	ONLINE	5	CUSTOMER	10000.00	RECEIVED		2025-06-14 14:25:46.228193	Bhatti	RV20250011	f	\N	ACCOUNTS	1
14	2025-06-14 14:28:15.354	ONLINE	4	CUSTOMER	15000.00	RECEIVED		2025-06-14 14:28:27.349044	sajjad	RV20250012	f	\N	ACCOUNTS	1
15	2025-06-14 14:34:09.796	CASH	2	SUPPLIER	1000.00	ISSUED		2025-06-14 14:34:30.149554	bhatti	PV20250001	f	\N	ACCOUNTS	\N
16	2025-06-14 14:36:52.738	CASH	2	SUPPLIER	190.00	ISSUED		2025-06-14 14:37:06.651611	ali	PV20250002	f	\N	ACCOUNTS	\N
17	2025-06-14 14:37:19.031	ONLINE	2	SUPPLIER	1000.00	ISSUED		2025-06-14 14:37:33.943944	bhatti	PV20250003	f	\N	ACCOUNTS	1
18	2025-06-14 14:56:33.95	ONLINE	2	SUPPLIER	100.00	ISSUED		2025-06-14 14:56:48.342664	ali	PV20250004	f	\N	ACCOUNTS	1
\.


--
-- Data for Name: pricing_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_entries (id, entry_type, reference_id, status, quantity, unit, price_per_unit, total_amount, processed_at, created_at) FROM stdin;
1	STORE_PURCHASE	1	PROCESSED	10.00	Piece	1000.00	10000.00	2025-04-23 15:55:10.985873	2025-04-22 16:19:45.626081
2	STORE_PURCHASE	8	PROCESSED	120.00	Piece	700.00	84000.00	2025-05-18 18:17:03.637699	2025-05-18 18:04:35.45781
3	STORE_PURCHASE	9	PROCESSED	10.00	Piece	250.00	2500.00	2025-05-18 18:23:46.007766	2025-05-18 18:23:36.031467
4	STORE_PURCHASE	10	PROCESSED	10.00	Liter	100.00	1000.00	2025-05-19 15:15:15.606396	2025-05-19 15:12:03.600525
10	STORE_PURCHASE	58	PENDING	10.00	Set	\N	\N	\N	2025-05-19 16:34:22.536956
12	STORE_PURCHASE	60	PENDING	5.00	Liter	\N	\N	\N	2025-05-19 16:38:16.216228
14	STORE_PURCHASE	62	PENDING	1.00	Liter	\N	\N	\N	2025-05-19 16:40:57.879471
16	STORE_PURCHASE	66	PENDING	1.00	Liter	\N	\N	\N	2025-05-19 16:45:44.463678
17	STORE_PURCHASE	67	PENDING	1.00	Liter	\N	\N	\N	2025-05-19 16:48:14.07199
18	STORE_PURCHASE	68	PENDING	-1.00	Liter	\N	\N	\N	2025-05-19 16:52:15.574875
19	STORE_PURCHASE	69	PENDING	-1.00	Liter	\N	NaN	\N	2025-05-19 16:59:21.49368
20	STORE_PURCHASE	70	PENDING	-10.00	Set	700.00	-7000.00	\N	2025-05-19 17:01:11.468868
21	STORE_PURCHASE	71	PENDING	-12.00	Set	700.00	-8400.00	\N	2025-05-19 17:04:22.620751
23	PURCHASE_RETURN	74	PROCESSED	8.00	Set	100.00	800.00	2025-05-19 18:04:28.562031	2025-05-19 17:57:44.482874
24	PURCHASE_RETURN	75	PROCESSED	10.00	Set	1000.00	10000.00	2025-05-19 18:09:14.018718	2025-05-19 18:07:38.089141
25	PURCHASE_RETURN	76	PROCESSED	10.00	Set	150.00	1500.00	2025-05-19 18:12:20.683899	2025-05-19 18:11:46.385424
27	PURCHASE_RETURN	78	PROCESSED	10.00	Set	100.00	1000.00	2025-05-19 18:19:10.652117	2025-05-19 18:18:19.887034
28	PURCHASE_RETURN	79	PROCESSED	10.00	Set	100.00	1000.00	2025-05-19 18:21:25.627266	2025-05-19 18:21:19.631483
29	PURCHASE_RETURN	80	PROCESSED	2.00	Set	100.00	200.00	2025-05-20 14:10:08.446673	2025-05-20 14:10:02.201154
31	STORE_RETURN	82	PROCESSED	10.00	Set	100.00	1000.00	2025-05-20 14:30:51.480325	2025-05-20 14:21:09.334371
32	STORE_RETURN	83	PROCESSED	2.00	Set	100.00	200.00	2025-05-20 14:33:56.498209	2025-05-20 14:33:49.480698
33	STORE_RETURN	84	PROCESSED	2.00	Set	300.00	600.00	2025-05-20 14:34:44.009246	2025-05-20 14:34:36.914677
34	STORE_RETURN	85	PROCESSED	2.00	Set	150.00	300.00	2025-05-20 14:39:13.26618	2025-05-20 14:39:06.806996
35	STORE_RETURN	86	PROCESSED	2.00	Set	120.00	240.00	2025-05-20 14:41:20.522294	2025-05-20 14:41:14.733381
36	STORE_RETURN	87	PROCESSED	2.00	Set	120.00	240.00	2025-05-20 14:43:29.441669	2025-05-20 14:43:23.581799
37	STORE_RETURN	88	PROCESSED	2.00	Set	120.00	240.00	2025-05-20 14:45:25.720916	2025-05-20 14:45:18.430299
38	STORE_PURCHASE	1	PROCESSED	10.00	Piece	1000.00	10000.00	2025-06-20 17:27:27.679704	2025-06-20 17:21:53.21773
\.


--
-- Data for Name: production; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production (id, date_time, paper_type, total_weight, total_reels, boiler_fuel_type, boiler_fuel_quantity, boiler_fuel_cost, total_yield_percentage, created_at, electricity_units, electricity_unit_price, electricity_cost) FROM stdin;
1	2025-06-15 15:36:01.759	Super	10000.00	0	Boiler Fuel (Toori)	5000.00	12000.00	\N	2025-06-15 15:36:46.858149	5000.00	50.00	250000.00
2	2025-06-20 17:52:50.466	Super	12000.00	0	Boiler Fuel (Toori)	5000.00	75000.00	\N	2025-06-20 17:53:44.060937	1000.00	60.00	60000.00
\.


--
-- Data for Name: production_paper_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_paper_types (id, production_id, paper_type, total_weight, boiler_fuel_cost, electricity_cost) FROM stdin;
1	1	Super	10000.00	0.00	0.00
2	2	Super	12000.00	0.00	0.00
\.


--
-- Data for Name: production_recipe; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_recipe (id, production_id, raddi_type, percentage_used, quantity_used, yield_percentage) FROM stdin;
1	1	Petti	25.00	3125.00	80.00
2	1	Dabbi Mix	75.00	10000.00	75.00
3	2	Petti	100.00	15000.00	80.00
\.


--
-- Data for Name: production_reels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_reels (id, production_id, size, weight) FROM stdin;
\.


--
-- Data for Name: purchasers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchasers (id, name, contact, address, created_at) FROM stdin;
\.


--
-- Data for Name: salary_increments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_increments (id, employee_id, previous_salary, new_salary, effective_date, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: salary_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_payments (id, employee_id, payment_month, payment_year, basic_salary, overtime_amount, deductions, net_amount, payment_date, status) FROM stdin;
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_adjustments (id, item_type, quantity, adjustment_type, reference_type, reference_id, date_time, created_at) FROM stdin;
1	Petti	-3125.00	PRODUCTION_USAGE	PRODUCTION	1	2025-06-15 15:36:01.759	2025-06-15 15:36:46.858149
2	Dabbi Mix	-10000.00	PRODUCTION_USAGE	PRODUCTION	1	2025-06-15 15:36:01.759	2025-06-15 15:36:46.858149
3	Boiler Fuel (Toori)	-5000.00	PRODUCTION_USAGE	PRODUCTION	1	2025-06-15 15:36:01.759	2025-06-15 15:36:46.858149
4	Petti	-15000.00	PRODUCTION_USAGE	PRODUCTION	2	2025-06-20 17:52:50.466	2025-06-20 17:53:44.060937
5	Boiler Fuel (Toori)	-5000.00	PRODUCTION_USAGE	PRODUCTION	2	2025-06-20 17:52:50.466	2025-06-20 17:53:44.060937
\.


--
-- Data for Name: store_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_entries (id, grn_number, entry_type, item_id, quantity, unit, vendor_id, department, issued_to, vehicle_number, driver_name, date_time, remarks, created_at) FROM stdin;
1	STI-250620-931-01	STORE_IN	1	10.00	Piece	6	\N	\N	123	fida	2025-06-20 12:21:30.318		2025-06-20 17:21:53.21773
2	ISSUE-3-1750423935902	STORE_OUT	1	2.00	Piece	\N	MAH	Maintenance Issue	\N	\N	2025-06-20 00:00:00	Maintenance issue ID: 3	2025-06-20 17:52:15.887661
\.


--
-- Data for Name: store_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_items (id, item_name, item_code, category, unit, current_stock, created_at) FROM stdin;
1	Baring	B597	Others	Piece	10.00	2025-06-20 17:21:41.681796
\.


--
-- Data for Name: store_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_returns (id, grn_number, quantity, date_time, remarks, created_at, return_grn, item_name, unit) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, contact, address, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, transaction_date, account_id, reference_no, entry_type, amount, description, item_name, quantity, unit, price_per_unit, created_at) FROM stdin;
1	2025-06-13 16:52:02.95	4	RV20250001	CREDIT	10000.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 16:52:24.614962
2	2025-06-13 16:59:32.668	4	RV20250002	CREDIT	10000.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 16:59:54.07331
3	2025-06-13 17:06:24.867	4	RV20250003	CREDIT	5000.00	Payment received	\N	\N	\N	\N	2025-06-13 17:09:31.756389
6	2025-06-13 17:09:31.777	4	RV20250004	CREDIT	4000.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 17:21:06.026897
7	2025-06-13 17:22:44.672	4	RV20250005	CREDIT	1000.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 17:22:56.706735
8	2025-06-13 19:48:17.787	4	RV20250006	CREDIT	1000.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 19:48:28.644686
9	2025-06-13 19:48:28.697	4	RV20250007	CREDIT	500.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 19:57:52.189041
10	2025-06-13 21:54:17.758	5	RV20250008	CREDIT	1700.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 21:54:33.211664
11	2025-06-13 21:55:32.439	4	RV20250009	CREDIT	1600.00	Payment received in cash	\N	\N	\N	\N	2025-06-13 21:55:47.451451
12	2025-06-14 13:58:52.918	5	RV20250010	CREDIT	1000.00	Payment received in cash	\N	\N	\N	\N	2025-06-14 13:59:06.404662
13	2025-06-14 14:25:29.37	5	RV20250011	CREDIT	10000.00	Payment received via bank transfer (Meezan)	\N	\N	\N	\N	2025-06-14 14:25:46.228193
14	2025-06-14 14:28:15.354	4	RV20250012	CREDIT	15000.00	Payment received via bank transfer (Meezan)	\N	\N	\N	\N	2025-06-14 14:28:27.349044
15	2025-06-14 14:34:09.796	2	PV20250001	DEBIT	1000.00	Payment issued in cash	\N	\N	\N	\N	2025-06-14 14:34:30.149554
16	2025-06-14 14:36:52.738	2	PV20250002	DEBIT	190.00	Payment issued in cash	\N	\N	\N	\N	2025-06-14 14:37:06.651611
17	2025-06-14 14:37:19.031	2	PV20250003	DEBIT	1000.00	Payment issued via bank transfer (Meezan)	\N	\N	\N	\N	2025-06-14 14:37:33.943944
18	2025-06-14 05:00:00	4	LV-250614-265	CREDIT	1000.00	Long Voucher: Paid from Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1 (Voucher: LV-250614-265)	\N	\N	\N	\N	2025-06-14 14:46:13.087901
19	2025-06-14 05:00:00	2	LV-250614-265	DEBIT	1000.00	Long Voucher: Paid from Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1 (Voucher: LV-250614-265)	\N	\N	\N	\N	2025-06-14 14:46:13.087901
20	2025-06-14 14:49:40.378	4	LV-250614-646	CREDIT	500.00	Long Voucher: Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:49:40.383237
21	2025-06-14 14:49:40.378	2	LV-250614-646	DEBIT	500.00	Long Voucher: Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:49:40.383237
22	2025-06-14 14:51:03.285	5	LV-250614-285	CREDIT	300.00	Long Voucher: Customer > Paper > RS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:51:03.288005
23	2025-06-14 14:51:03.285	2	LV-250614-285	DEBIT	300.00	Long Voucher: Customer > Paper > RS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:51:03.288005
24	2025-06-14 14:54:33.164	4	LV-250614-782	CREDIT	100.00	Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:54:33.167513
25	2025-06-14 14:54:33.164	2	LV-250614-782	DEBIT	100.00	Customer > Paper > SMS to RECEIVABLE > Raddi  > Sajjad1	\N	\N	\N	\N	2025-06-14 14:54:33.167513
26	2025-06-14 14:56:33.95	2	PV20250004	DEBIT	100.00	Payment issued via bank transfer (Meezan)	\N	\N	\N	\N	2025-06-14 14:56:48.342664
27	2025-06-14 15:11:37.03	2	GRN-SP-250614-670	CREDIT	250000.00	Purchase against GRN: GRN-SP-250614-670	Petti	5000.00	KG	50.00	2025-06-14 15:11:37.010632
28	2025-06-14 15:20:31.398	2	GRN-SP-250614-326	CREDIT	500000.00	Purchase against GRN: GRN-SP-250614-326	Petti	10000.00	KG	50.00	2025-06-14 15:20:31.390868
29	2025-06-15 15:26:29.432	2	GRN-SP-250614-357	CREDIT	500000.00	Purchase	Petti	10000.00	KG	50.00	2025-06-15 15:26:29.061551
30	2025-06-15 15:29:19.232	2	GRN-SP-250615-963	CREDIT	275000.00	Purchase	Petti	5000.00	KG	55.00	2025-06-15 15:29:19.229086
31	2025-06-15 15:33:47.711	2	GRN-SDM-250615-088	CREDIT	330000.00	Purchase	Dabbi Mix	10000.00	KG	33.00	2025-06-15 15:33:47.706454
32	2025-06-15 15:35:58.403	2	GRN-SBF-250615-013	CREDIT	375000.00	Purchase	Boiler Fuel (Toori)	25000.00	KG	15.00	2025-06-15 15:35:58.399577
33	2025-06-15 16:18:39.291	4	SO-SS-250615-953	DEBIT	910000.00	Sale	Super	10000.00	KG	91.00	2025-06-15 16:18:39.287332
34	2025-06-16 15:32:52.964	2	GRN-SP-250616-307	CREDIT	482500.00	Purchase	Petti	9650.00	KG	50.00	2025-06-16 15:32:52.941868
35	2025-06-20 17:27:27.679	6	STI-250620-931-01	CREDIT	10000.00	Store Purchase: Baring from Murtaza	Baring	10.00	Piece	1000.00	2025-06-20 17:27:27.679704
36	2025-06-20 18:12:19.651306	5	SO-RS-250620-419	CREDIT	15000.00	Freight Adjustment - SO-RS-250620-419	\N	\N	\N	\N	2025-06-20 18:12:19.651306
37	2025-06-20 18:15:23.435298	5	SO-RS-250620-894	CREDIT	10000.00	Freight Adjustment - SO-RS-250620-894	\N	\N	\N	\N	2025-06-20 18:15:23.435298
38	2025-06-20 18:17:16.321514	5	SO-RS-250620-660-FREIGHT	CREDIT	1000.00	Freight Adjustment - SO-RS-250620-660	\N	\N	\N	\N	2025-06-20 18:17:16.321514
39	2025-06-20 18:21:17.203	5	SO-RS-250620-660	DEBIT	91000.00	Sale Super	Super	1000.00	KG	91.00	2025-06-20 18:21:17.197287
40	2025-06-20 18:22:42.112595	5	SO-RS-250620-119	DEBIT	0.00	Sale Out - SO-RS-250620-119 (Pending Pricing)	\N	\N	\N	\N	2025-06-20 18:22:42.112595
41	2025-06-20 18:22:42.112595	5	SO-RS-250620-119-FREIGHT	CREDIT	1000.00	Freight Adjustment - SO-RS-250620-119	\N	\N	\N	\N	2025-06-20 18:22:42.112595
42	2025-06-20 18:28:12.878112	5	SO-RS-250620-502	DEBIT	0.00	Sale Out - SO-RS-250620-502 (Pending Pricing)	\N	\N	\N	\N	2025-06-20 18:28:12.878112
43	2025-06-20 18:31:29.200976	5	SO-RS-250620-795	DEBIT	0.00	Sale Out - SO-RS-250620-795 (Pending Pricing)	\N	\N	\N	\N	2025-06-20 18:31:29.200976
44	2025-06-20 18:33:31.074	4	SO-SS-250620-668	DEBIT	95000.00	Sale Super	Super	1000.00	KG	95.00	2025-06-20 18:33:31.06992
45	2025-06-20 19:39:43.357	5	SO-RS-250620-499	DEBIT	114000.00	Sale Super	Super	1200.00	KG	95.00	2025-06-20 19:39:43.352118
46	2025-06-20 19:39:43.358	5		CREDIT	1500.00	Freight Adjustment	\N	\N	\N	\N	2025-06-20 19:39:43.352118
47	2025-06-20 19:40:50.187	5	SO-RS-250620-279	DEBIT	100000.00	Sale Super	Super	1000.00	KG	100.00	2025-06-20 19:40:50.182672
48	2025-06-20 19:40:50.188	5		CREDIT	1000.00	Freight Adjustment	\N	\N	\N	\N	2025-06-20 19:40:50.182672
49	2025-06-20 19:52:27.98	5	SO-RS-250620-506	DEBIT	114000.00	Sale Super	Super	1200.00	KG	95.00	2025-06-20 19:52:27.974805
50	2025-06-20 19:52:27.981	5	FRSO-RS-250620-506	CREDIT	1000.00	Freight Adjustment	Freight	1.00	Entry	1000.00	2025-06-20 19:52:27.974805
51	2025-06-20 19:55:16.556	4	SO-SS-250620-497	DEBIT	151300.00	Sale Super	Super	1700.00	KG	89.00	2025-06-20 19:55:16.551577
52	2025-06-20 19:55:16.558	4	FRSO-SS-250620-497	CREDIT	1000.00	Freight Adjustment	Freight	1.00	Entry	1000.00	2025-06-20 19:55:16.551577
53	2025-06-20 19:57:13.738	5	SO-RS-250620-319	DEBIT	100000.00	Sale Super	Super	1000.00	KG	100.00	2025-06-20 19:57:13.735087
54	2025-06-20 19:57:13.739	5	FRSO-RS-250620-319	CREDIT	1000.00	Freight Adjustment	Freight	1.00	Entry	1000.00	2025-06-20 19:57:13.735087
55	2025-06-20 19:58:52.932	5	SO-RS-250620-207	DEBIT	100000.00	Sale Super	Super	1000.00	KG	100.00	2025-06-20 19:58:52.919629
56	2025-06-20 19:58:52.936	5	FRSO-RS-250620-207	CREDIT	1900.00	Freight Adjustment	Freight	1.00	Entry	1900.00	2025-06-20 19:58:52.919629
57	2025-06-21 15:15:04.211	5	SO-RS-250621-699	DEBIT	98000.00	Sale Super	Super	1000.00	KG	98.00	2025-06-21 15:15:04.194855
58	2025-06-21 15:19:43.4	5	SO-RS-250621-428	DEBIT	99000.00	Sale Super	Super	1000.00	KG	99.00	2025-06-21 15:19:43.395021
59	2025-06-21 15:23:21.216	5	SO-RS-250621-247	DEBIT	190000.00	Sale Super	Super	1900.00	KG	100.00	2025-06-21 15:23:21.210771
60	2025-06-21 15:23:21.217	5	FR-SO-RS-250621-247	CREDIT	1000.00	Freight Adjustment	Super	1900.00	KG	0.00	2025-06-21 15:23:21.210771
61	2025-06-21 15:29:25.878	5	SO-RS-250621-842	DEBIT	100000.00	Sale Super	Super	1000.00	KG	100.00	2025-06-21 15:29:25.87527
62	2025-06-21 15:29:25.88	5	FR-SO-RS-250621-842	CREDIT	1000.00	Freight Adjustment	Super	1000.00	KG	0.00	2025-06-21 15:29:25.87527
\.


--
-- Data for Name: workers_salary_totals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workers_salary_totals (id, month, year, total_amount, created_at) FROM stdin;
1	6	2025	1003226.00	2025-06-20 18:02:12.358132
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 5, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, true);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_transactions_id_seq', 6, true);


--
-- Name: cash_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_tracking_id_seq', 1, true);


--
-- Name: cash_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_transactions_id_seq', 15, true);


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_id_seq', 1, false);


--
-- Name: chart_of_accounts_level1_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level1_id_seq', 4, true);


--
-- Name: chart_of_accounts_level2_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level2_id_seq', 4, true);


--
-- Name: chart_of_accounts_level3_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level3_id_seq', 6, true);


--
-- Name: contractor_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractor_payments_id_seq', 1, false);


--
-- Name: contractor_salary_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractor_salary_history_id_seq', 1, false);


--
-- Name: contractors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contractors_id_seq', 2, true);


--
-- Name: daily_attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_attendance_id_seq', 4, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 8, true);


--
-- Name: expense_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_types_id_seq', 1, false);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, true);


--
-- Name: final_settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.final_settlements_id_seq', 1, false);


--
-- Name: gate_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_id_seq', 31, true);


--
-- Name: gate_entries_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_pricing_id_seq', 26, true);


--
-- Name: gate_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_returns_id_seq', 1, false);


--
-- Name: income_statement_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.income_statement_adjustments_id_seq', 1, false);


--
-- Name: item_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.item_types_id_seq', 3, true);


--
-- Name: leave_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_applications_id_seq', 1, false);


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledger_entries_id_seq', 1, true);


--
-- Name: ledgers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledgers_id_seq', 14, true);


--
-- Name: loan_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_applications_id_seq', 1, false);


--
-- Name: loan_installments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loan_installments_id_seq', 1, false);


--
-- Name: maintenance_grn_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_grn_seq', 8, true);


--
-- Name: maintenance_issue_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_issue_items_id_seq', 3, true);


--
-- Name: maintenance_issues_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenance_issues_id_seq', 3, true);


--
-- Name: monthly_price_averages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_price_averages_id_seq', 1, false);


--
-- Name: monthly_salary_totals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_salary_totals_id_seq', 1, true);


--
-- Name: paper_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paper_types_id_seq', 1, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 18, true);


--
-- Name: pricing_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricing_entries_id_seq', 38, true);


--
-- Name: production_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_id_seq', 2, true);


--
-- Name: production_paper_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_paper_types_id_seq', 2, true);


--
-- Name: production_recipe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_recipe_id_seq', 3, true);


--
-- Name: production_reels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_reels_id_seq', 1, false);


--
-- Name: purchasers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchasers_id_seq', 1, false);


--
-- Name: salary_increments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_increments_id_seq', 1, false);


--
-- Name: salary_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_payments_id_seq', 1, false);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_adjustments_id_seq', 5, true);


--
-- Name: store_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_entries_id_seq', 2, true);


--
-- Name: store_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_items_id_seq', 1, true);


--
-- Name: store_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.store_returns_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 62, true);


--
-- Name: workers_salary_totals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.workers_salary_totals_id_seq', 1, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_account_number_key UNIQUE (account_number);


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
-- Name: cash_transactions cash_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT cash_transactions_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts_level1 chart_of_accounts_level1_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level1
    ADD CONSTRAINT chart_of_accounts_level1_name_key UNIQUE (name);


--
-- Name: chart_of_accounts_level1 chart_of_accounts_level1_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level1
    ADD CONSTRAINT chart_of_accounts_level1_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts_level2 chart_of_accounts_level2_name_level1_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level2
    ADD CONSTRAINT chart_of_accounts_level2_name_level1_id_key UNIQUE (name, level1_id);


--
-- Name: chart_of_accounts_level2 chart_of_accounts_level2_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level2
    ADD CONSTRAINT chart_of_accounts_level2_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts_level3 chart_of_accounts_level3_name_level2_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3
    ADD CONSTRAINT chart_of_accounts_level3_name_level2_id_key UNIQUE (name, level2_id);


--
-- Name: chart_of_accounts_level3 chart_of_accounts_level3_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3
    ADD CONSTRAINT chart_of_accounts_level3_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


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
-- Name: expense_types expense_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_types
    ADD CONSTRAINT expense_types_name_key UNIQUE (name);


--
-- Name: expense_types expense_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_types
    ADD CONSTRAINT expense_types_pkey PRIMARY KEY (id);


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
-- Name: item_types item_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_name_key UNIQUE (name);


--
-- Name: item_types item_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_pkey PRIMARY KEY (id);


--
-- Name: leave_applications leave_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT leave_applications_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: ledgers ledgers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledgers
    ADD CONSTRAINT ledgers_pkey PRIMARY KEY (id);


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
-- Name: paper_types paper_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_types
    ADD CONSTRAINT paper_types_name_key UNIQUE (name);


--
-- Name: paper_types paper_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paper_types
    ADD CONSTRAINT paper_types_pkey PRIMARY KEY (id);


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
-- Name: production_paper_types production_paper_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_paper_types
    ADD CONSTRAINT production_paper_types_pkey PRIMARY KEY (id);


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
-- Name: idx_bank_transactions_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_transactions_account_id ON public.bank_transactions USING btree (account_id);


--
-- Name: idx_bank_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_transactions_date ON public.bank_transactions USING btree (transaction_date);


--
-- Name: idx_chart_of_accounts_level1_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level1_name ON public.chart_of_accounts_level1 USING btree (name);


--
-- Name: idx_chart_of_accounts_level2_level1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level2_level1 ON public.chart_of_accounts_level2 USING btree (level1_id);


--
-- Name: idx_chart_of_accounts_level2_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level2_name ON public.chart_of_accounts_level2 USING btree (name);


--
-- Name: idx_chart_of_accounts_level3_level1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level3_level1 ON public.chart_of_accounts_level3 USING btree (level1_id);


--
-- Name: idx_chart_of_accounts_level3_level2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level3_level2 ON public.chart_of_accounts_level3 USING btree (level2_id);


--
-- Name: idx_chart_of_accounts_level3_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chart_of_accounts_level3_name ON public.chart_of_accounts_level3 USING btree (name);


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
-- Name: idx_gate_entries_freight; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_entries_freight ON public.gate_entries USING btree (has_freight);


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
-- Name: idx_ledgers_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ledgers_account ON public.ledgers USING btree (account_id, account_type);


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
-- Name: bank_transactions bank_balance_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER bank_balance_update BEFORE INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance();


--
-- Name: transactions check_account_id_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_account_id_trigger BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.check_account_id_exists();


--
-- Name: gate_entries check_chart_account_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_chart_account_trigger BEFORE INSERT OR UPDATE ON public.gate_entries FOR EACH ROW EXECUTE FUNCTION public.check_chart_account_exists();


--
-- Name: gate_entries_pricing check_chart_account_trigger_pricing; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_chart_account_trigger_pricing BEFORE INSERT OR UPDATE ON public.gate_entries_pricing FOR EACH ROW EXECUTE FUNCTION public.check_chart_account_exists_pricing();


--
-- Name: bank_transactions bank_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.bank_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_level1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_level1_id_fkey FOREIGN KEY (level1_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_level2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_level2_id_fkey FOREIGN KEY (level2_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: chart_of_accounts_level2 chart_of_accounts_level2_level1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level2
    ADD CONSTRAINT chart_of_accounts_level2_level1_id_fkey FOREIGN KEY (level1_id) REFERENCES public.chart_of_accounts_level1(id);


--
-- Name: chart_of_accounts chart_of_accounts_level3_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_level3_id_fkey FOREIGN KEY (level3_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: chart_of_accounts_level3 chart_of_accounts_level3_level1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3
    ADD CONSTRAINT chart_of_accounts_level3_level1_id_fkey FOREIGN KEY (level1_id) REFERENCES public.chart_of_accounts_level1(id);


--
-- Name: chart_of_accounts_level3 chart_of_accounts_level3_level2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3
    ADD CONSTRAINT chart_of_accounts_level3_level2_id_fkey FOREIGN KEY (level2_id) REFERENCES public.chart_of_accounts_level2(id);


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
-- Name: gate_entries_pricing gate_entries_pricing_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_entries_pricing
    ADD CONSTRAINT gate_entries_pricing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id);


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
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


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
-- Name: maintenance_issues maintenance_issues_department_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_issues
    ADD CONSTRAINT maintenance_issues_department_code_fkey FOREIGN KEY (department_code) REFERENCES public.departments(code);


--
-- Name: payments payments_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: production_paper_types production_paper_types_production_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.production_paper_types
    ADD CONSTRAINT production_paper_types_production_id_fkey FOREIGN KEY (production_id) REFERENCES public.production(id);


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
-- PostgreSQL database dump complete
--

