--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Name: assign_unified_id_level1(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_unified_id_level1() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_unified_id_level1() OWNER TO postgres;

--
-- Name: assign_unified_id_level2(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_unified_id_level2() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_unified_id_level2() OWNER TO postgres;

--
-- Name: assign_unified_id_level3(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_unified_id_level3() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_unified_id_level3() OWNER TO postgres;

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
-- Name: get_next_unified_account_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_unified_account_id() RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN nextval('unified_account_id_seq');
END;
$$;


ALTER FUNCTION public.get_next_unified_account_id() OWNER TO postgres;

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
    CONSTRAINT accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'EXPENSE'::character varying])::text[])))
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
    account_number character varying(50) NOT NULL,
    branch_name character varying(100),
    ifsc_code character varying(20),
    account_type character varying(20) DEFAULT 'CURRENT'::character varying,
    balance numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    balance numeric(15,2) NOT NULL,
    reference character varying(100),
    type character varying(10),
    amount numeric(15,2) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    balance_after numeric(15,2) NOT NULL,
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
    unified_id integer NOT NULL,
    CONSTRAINT chart_of_accounts_level1_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying, 'EXPENSE'::character varying])::text[]))),
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
    unified_id integer NOT NULL,
    CONSTRAINT chart_of_accounts_level2_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying, 'EXPENSE'::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_level2_balance_type_check CHECK (((balance_type)::text = ANY (ARRAY[('DEBIT'::character varying)::text, ('CREDIT'::character varying)::text])))
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
    unified_id integer NOT NULL,
    CONSTRAINT chart_of_accounts_level3_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['SUPPLIER'::character varying, 'CUSTOMER'::character varying, 'VENDOR'::character varying, 'ACCOUNT'::character varying, 'EXPENSE'::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_level3_balance_type_check CHECK (((balance_type)::text = ANY (ARRAY[('DEBIT'::character varying)::text, ('CREDIT'::character varying)::text])))
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
    CONSTRAINT daily_attendance_status_check CHECK (((status)::text = ANY (ARRAY[('Present'::character varying)::text, ('Absent'::character varying)::text, ('Half Day'::character varying)::text, ('On Leave'::character varying)::text, ('Holiday'::character varying)::text, ('Weekend'::character varying)::text])))
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
    CONSTRAINT valid_employee_separation_type CHECK (((separation_type)::text = ANY (ARRAY[('terminate'::character varying)::text, ('resign'::character varying)::text])))
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
    expense_type character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    receiver_name character varying(100),
    remarks text,
    voucher_no character varying(20),
    created_by integer,
    processed_by_role character varying(50),
    account_id integer,
    account_type character varying(50),
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
    CONSTRAINT valid_separation_type CHECK (((separation_type)::text = ANY (ARRAY[('terminate'::character varying)::text, ('resign'::character varying)::text])))
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
    CONSTRAINT gate_entries_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('PURCHASE_IN'::character varying)::text, ('SALE_OUT'::character varying)::text, ('PURCHASE_RETURN'::character varying)::text, ('SALE_RETURN'::character varying)::text])))
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
    CONSTRAINT gate_entries_pricing_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('PURCHASE'::character varying)::text, ('SALE'::character varying)::text, ('PURCHASE_RETURN'::character varying)::text, ('SALE_RETURN'::character varying)::text]))),
    CONSTRAINT gate_entries_pricing_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PROCESSED'::character varying)::text])))
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
    CONSTRAINT gate_returns_return_type_check CHECK (((return_type)::text = ANY (ARRAY[('PURCHASE_RETURN'::character varying)::text, ('SALE_RETURN'::character varying)::text])))
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
    CONSTRAINT valid_category CHECK (((category)::text = ANY (ARRAY[('LABOR'::character varying)::text, ('MATERIALS'::character varying)::text, ('BOILER_FUEL'::character varying)::text, ('ENERGY'::character varying)::text, ('MAINTENANCE'::character varying)::text, ('PRODUCTION'::character varying)::text])))
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
    CONSTRAINT leave_applications_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
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
    account_type character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    CONSTRAINT ledgers_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('LEVEL1'::character varying)::text, ('LEVEL2'::character varying)::text, ('LEVEL3'::character varying)::text]))),
    CONSTRAINT ledgers_balance_type_check CHECK (((balance_type)::text = ANY (ARRAY[('DEBIT'::character varying)::text, ('CREDIT'::character varying)::text])))
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
    CONSTRAINT loan_applications_loan_type_check CHECK (((loan_type)::text = ANY (ARRAY[('loan'::character varying)::text, ('advance'::character varying)::text]))),
    CONSTRAINT loan_applications_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
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
    CONSTRAINT pricing_entries_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('PROCESSED'::character varying)::text])))
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
    CONSTRAINT production_boiler_fuel_type_check CHECK (((boiler_fuel_type)::text = ANY (ARRAY[('Boiler Fuel (Toori)'::character varying)::text, ('Boiler Fuel (Tukka)'::character varying)::text]))),
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
    CONSTRAINT store_entries_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('STORE_IN'::character varying)::text, ('STORE_OUT'::character varying)::text])))
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
    unified_account_id integer,
    CONSTRAINT transactions_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('DEBIT'::character varying)::text, ('CREDIT'::character varying)::text])))
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
-- Name: unified_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unified_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unified_account_id_seq OWNER TO postgres;

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
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, bank_name, account_name, account_number, branch_name, ifsc_code, account_type, balance, status, created_at, updated_at) FROM stdin;
2	Meezan		123456789			CURRENT	0.00	ACTIVE	2025-06-28 14:07:40.565729	2025-06-28 14:07:40.565729
\.


--
-- Data for Name: bank_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_transactions (id, account_id, transaction_date, balance, reference, type, amount, remarks, created_at, balance_after) FROM stdin;
\.


--
-- Data for Name: cash_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_tracking (id, cash_in_hand, cash_in_bank, last_updated) FROM stdin;
2	1014.00	0.00	2025-07-07 15:39:32.056119
\.


--
-- Data for Name: cash_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_transactions (id, transaction_date, type, amount, reference, remarks, balance, balance_after, created_at) FROM stdin;
18	2025-06-28 14:07:59.453	CREDIT	10000.00	RV20250001	Payment from ali	0.00	10000.00	2025-06-28 14:10:29.807657
19	2025-06-28 14:11:35.022	DEBIT	5000.00	PV20250001	Payment to ali	10000.00	5000.00	2025-06-28 14:11:48.45832
20	2025-06-28 15:52:45.34	DEBIT	57.00	EV20250011	Expense payment to afrt	5000.00	4943.00	2025-06-28 15:54:25.039527
21	2025-07-06 00:54:45.033	CREDIT	1000.00	RV20250002	Payment from ali	4943.00	5943.00	2025-07-06 00:55:03.006922
22	2025-07-06 00:59:37.807	CREDIT	1000.00	RV20250003	Payment from ali	5943.00	6943.00	2025-07-06 00:59:58.394038
23	2025-07-06 01:48:08.664	CREDIT	500.00	RV20250004	Payment from adeel	6943.00	7443.00	2025-07-06 01:48:25.717389
24	2025-07-06 22:32:51.949	DEBIT	100.00	EV20250012	Expense payment to fida	7443.00	7343.00	2025-07-06 22:33:09.384342
25	2025-07-06 22:36:30.565	DEBIT	100.00	EV20250013	Expense payment to fida	7343.00	7243.00	2025-07-06 22:36:48.895236
26	2025-07-06 22:38:45.188	DEBIT	99.00	EV20250014	Expense payment to ali	7243.00	7144.00	2025-07-06 22:39:01.233736
27	2025-07-06 22:48:10.874	CREDIT	109.00	RV20250005	Payment from ali	7144.00	7253.00	2025-07-06 22:48:27.708073
28	2025-07-06 23:06:20.507	DEBIT	99.00	EV20250015	Expense payment to ali	7253.00	7154.00	2025-07-06 23:06:39.364405
29	2025-07-06 23:08:07.563	DEBIT	100.00	EV20250016	Expense payment to LI	7154.00	7054.00	2025-07-06 23:08:47.289703
30	2025-07-07 14:55:40.46	DEBIT	499.00	EV20250017	Expense payment to fida	7054.00	6555.00	2025-07-07 14:56:00.867258
31	2025-07-07 15:19:53.806	DEBIT	600.00	EV20250018	Expense payment to gtyu	6555.00	5955.00	2025-07-07 15:20:12.451271
32	2025-07-07 15:28:35.998	DEBIT	890.00	EV20250019	Expense payment to ghj	5955.00	5065.00	2025-07-07 15:28:59.17125
33	2025-07-07 15:31:10.935	DEBIT	700.00	EV20250020	Expense payment to bnm	5065.00	4365.00	2025-07-07 15:37:37.91199
34	2025-07-07 15:39:12.771	DEBIT	699.00	EV20250021	Expense payment to ali	4365.00	3666.00	2025-07-07 15:39:32.056119
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts (id, name, account_type, level1_id, level2_id, level3_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chart_of_accounts_level1; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level1 (id, name, opening_balance, balance_type, account_type, created_at, updated_at, unified_id) FROM stdin;
5	Receivables	0.00	DEBIT	ACCOUNT	2025-06-28 14:05:49.099681	2025-06-28 14:05:49.099681	1
6	Payables	0.00	DEBIT	ACCOUNT	2025-06-28 14:06:25.502073	2025-06-28 14:06:25.502073	2
7	Expense	0.00	DEBIT	ACCOUNT	2025-06-28 14:18:49.26688	2025-06-28 14:18:49.26688	3
\.


--
-- Data for Name: chart_of_accounts_level2; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level2 (id, name, opening_balance, balance_type, account_type, level1_id, created_at, updated_at, unified_id) FROM stdin;
5	Raddi	0.00	DEBIT	ACCOUNT	5	2025-06-28 14:06:02.198046	2025-06-28 14:06:02.198046	4
6	customer	0.00	DEBIT	ACCOUNT	5	2025-06-28 14:06:36.212237	2025-06-28 14:06:36.212237	5
7	Regular	0.00	DEBIT	ACCOUNT	7	2025-06-28 14:19:01.965002	2025-06-28 14:19:01.965002	6
\.


--
-- Data for Name: chart_of_accounts_level3; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chart_of_accounts_level3 (id, name, opening_balance, balance_type, account_type, level1_id, level2_id, created_at, updated_at, unified_id) FROM stdin;
7	Sajjad	0.00	DEBIT	SUPPLIER	5	5	2025-06-28 14:06:16.228922	2025-06-28 14:06:16.228922	7
8	RS	0.00	DEBIT	CUSTOMER	5	6	2025-06-28 14:06:49.237034	2025-06-28 14:06:49.237034	8
9	Petrol	0.00	DEBIT	ACCOUNT	7	7	2025-06-28 14:19:16.90545	2025-06-28 14:19:16.90545	9
11	Petrol1	0.00	DEBIT	EXPENSE	7	7	2025-06-28 15:00:11.98864	2025-06-28 15:00:11.98864	10
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
\.


--
-- Data for Name: daily_attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_attendance (id, employee_id, attendance_date, status, in_time, out_time, overtime, remarks, created_at, salary_for_day, hours_worked, standard_hours) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, code, created_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, first_name, last_name, department_id, designation, joining_date, salary, phone, status, created_at, termination_date, separation_type, due_salary, emergency_contact_name, emergency_contact_phone) FROM stdin;
\.


--
-- Data for Name: expense_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_types (id, name, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, date, expense_type, amount, receiver_name, remarks, voucher_no, created_by, processed_by_role, account_id, account_type, created_at) FROM stdin;
5	2025-06-28 15:08:07.499	Expense > Regular	100.00	fida		EV20250001	\N	ACCOUNTS	11	OTHER	2025-06-28 15:08:22.627263
7	2025-06-28 15:17:15.814	Expense > Regular	100.00	adel		EV20250002	\N	ACCOUNTS	11	OTHER	2025-06-28 15:17:31.63239
8	2025-06-28 15:18:45.036	Expense > Regular	1500.00	adel		EV20250003	\N	ACCOUNTS	11	OTHER	2025-06-28 15:18:59.707971
9	2025-06-28 15:29:52.591	Expense > Regular	10.00	adel		EV20250004	\N	ACCOUNTS	11	OTHER	2025-06-28 15:30:05.916263
10	2025-06-28 15:34:18.897	Expense > Regular	1400.00	adel		EV20250005	\N	ACCOUNTS	11	OTHER	2025-06-28 15:34:39.093527
11	2025-06-28 15:37:35.297	Expense > Regular	15.00	adel		EV20250006	\N	ACCOUNTS	11	OTHER	2025-06-28 15:37:47.081422
12	2025-06-28 15:37:47.161	Expense > Regular	12.00	adel		EV20250007	\N	ACCOUNTS	11	OTHER	2025-06-28 15:41:43.985047
13	2025-06-28 15:42:37.583	Expense > Regular	12.00	afrt		EV20250008	\N	ACCOUNTS	11	OTHER	2025-06-28 15:42:54.013862
14	2025-06-28 15:42:54.092	Expense > Regular	33.00	afrt		EV20250009	\N	ACCOUNTS	11	OTHER	2025-06-28 15:48:13.445555
15	2025-06-28 15:48:13.55	Expense > Regular	10.00	afrt		EV20250010	\N	ACCOUNTS	11	OTHER	2025-06-28 15:52:45.211685
16	2025-06-28 15:52:45.34	Expense > Regular	57.00	afrt		EV20250011	\N	ACCOUNTS	11	OTHER	2025-06-28 15:54:25.039527
17	2025-07-06 22:32:51.949	Expense > Regular	100.00	fida		EV20250012	\N	ACCOUNTS	11	OTHER	2025-07-06 22:33:09.384342
18	2025-07-06 22:36:30.565	Expense > Regular	100.00	fida		EV20250013	\N	ACCOUNTS	11	OTHER	2025-07-06 22:36:48.895236
19	2025-07-06 22:38:45.188	Expense > Regular	99.00	ali		EV20250014	\N	ACCOUNTS	11	OTHER	2025-07-06 22:39:01.233736
20	2025-07-06 23:06:20.507	Expense > Regular	99.00	ali		EV20250015	\N	ACCOUNTS	11	OTHER	2025-07-06 23:06:39.364405
21	2025-07-06 23:08:07.563	Expense > Regular	100.00	LI		EV20250016	\N	ACCOUNTS	11	OTHER	2025-07-06 23:08:47.289703
22	2025-07-07 14:55:40.46	Expense > Regular	499.00	fida		EV20250017	\N	ACCOUNTS	11	OTHER	2025-07-07 14:56:00.867258
23	2025-07-07 15:19:53.806	Expense > Regular > Petrol1	600.00	gtyu		EV20250018	\N	ACCOUNTS	11	OTHER	2025-07-07 15:20:12.451271
24	2025-07-07 15:28:35.998	Expense > Regular > Petrol1	890.00	ghj		EV20250019	\N	ACCOUNTS	11	OTHER	2025-07-07 15:28:59.17125
25	2025-07-07 15:31:10.935	Expense > Regular > Petrol1	700.00	bnm		EV20250020	\N	ACCOUNTS	11	OTHER	2025-07-07 15:37:37.91199
26	2025-07-07 15:39:12.771	Expense > Regular > Petrol1	699.00	ali		EV20250021	\N	ACCOUNTS	11	OTHER	2025-07-07 15:39:32.056119
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
32	GRN-SP-250628-055	PURCHASE_IN	7	\N	\N	123	ali	Petti	\N	10000.00	KG	2025-06-28 09:13:31.683	Supplier Qty: 10000, Received Qty: 10000, 	2025-06-28 14:13:58.074814	f	0.00	f
\.


--
-- Data for Name: gate_entries_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gate_entries_pricing (id, entry_type, grn_number, account_id, item_id, quantity, price_per_unit, total_amount, status, processed_at, created_at, final_quantity, cut_weight, processed_by_role) FROM stdin;
27	PURCHASE	GRN-SP-250628-055	7	\N	10000.00	50.00	500000.00	PROCESSED	2025-06-28 14:14:04.648499	2025-06-28 14:13:58.074814	10000.00	0.00	ACCOUNTS
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
4	Petti		2025-06-28 14:13:43.474052
\.


--
-- Data for Name: leave_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_applications (id, employee_id, start_date, end_date, reason, leave_with_pay, status, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, date, account_id, debit_amount, credit_amount, description, voucher_no, created_by, processed_by_role, account_type, created_at) FROM stdin;
5	2025-06-28 15:08:07.499	11	100.00	0.00	Expense payment to fida - No remarks	EV20250001	\N	ACCOUNTS	LEVEL3	2025-06-28 15:08:22.627263
6	2025-06-28 15:08:07.499	1	0.00	100.00	Expense payment to fida - No remarks	EV20250001	\N	ACCOUNTS	CASH	2025-06-28 15:08:22.627263
7	2025-06-28 15:08:07.499	7	100.00	0.00	Expense payment to fida - No remarks	EV20250001	\N	ACCOUNTS	LEVEL1	2025-06-28 15:08:22.627263
8	2025-06-28 15:08:07.499	7	100.00	0.00	Expense payment to fida - No remarks	EV20250001	\N	ACCOUNTS	LEVEL2	2025-06-28 15:08:22.627263
9	2025-06-28 15:17:15.814	11	100.00	0.00	Expense payment to adel - No remarks	EV20250002	\N	ACCOUNTS	LEVEL3	2025-06-28 15:17:31.63239
10	2025-06-28 15:17:15.814	1	0.00	100.00	Expense payment to adel - No remarks	EV20250002	\N	ACCOUNTS	CASH	2025-06-28 15:17:31.63239
11	2025-06-28 15:17:15.814	7	100.00	0.00	Expense payment to adel - No remarks	EV20250002	\N	ACCOUNTS	LEVEL1	2025-06-28 15:17:31.63239
12	2025-06-28 15:17:15.814	7	100.00	0.00	Expense payment to adel - No remarks	EV20250002	\N	ACCOUNTS	LEVEL2	2025-06-28 15:17:31.63239
13	2025-06-28 15:18:45.036	11	1500.00	0.00	Expense payment to adel - No remarks	EV20250003	\N	ACCOUNTS	LEVEL3	2025-06-28 15:18:59.707971
14	2025-06-28 15:18:45.036	1	0.00	1500.00	Expense payment to adel - No remarks	EV20250003	\N	ACCOUNTS	CASH	2025-06-28 15:18:59.707971
15	2025-06-28 15:18:45.036	7	1500.00	0.00	Expense payment to adel - No remarks	EV20250003	\N	ACCOUNTS	LEVEL1	2025-06-28 15:18:59.707971
16	2025-06-28 15:18:45.036	7	1500.00	0.00	Expense payment to adel - No remarks	EV20250003	\N	ACCOUNTS	LEVEL2	2025-06-28 15:18:59.707971
17	2025-06-28 15:29:52.591	11	10.00	0.00	Expense payment to adel - No remarks	EV20250004	\N	ACCOUNTS	LEVEL3	2025-06-28 15:30:05.916263
18	2025-06-28 15:29:52.591	1	0.00	10.00	Expense payment to adel - No remarks	EV20250004	\N	ACCOUNTS	CASH	2025-06-28 15:30:05.916263
19	2025-06-28 15:29:52.591	7	10.00	0.00	Expense payment to adel - No remarks	EV20250004	\N	ACCOUNTS	LEVEL1	2025-06-28 15:30:05.916263
20	2025-06-28 15:29:52.591	7	10.00	0.00	Expense payment to adel - No remarks	EV20250004	\N	ACCOUNTS	LEVEL2	2025-06-28 15:30:05.916263
21	2025-06-28 15:34:18.897	11	1400.00	0.00	Expense payment to adel - No remarks	EV20250005	\N	ACCOUNTS	LEVEL3	2025-06-28 15:34:39.093527
22	2025-06-28 15:34:18.897	1	0.00	1400.00	Expense payment to adel - No remarks	EV20250005	\N	ACCOUNTS	CASH	2025-06-28 15:34:39.093527
23	2025-06-28 15:34:18.897	7	1400.00	0.00	Expense payment to adel - No remarks	EV20250005	\N	ACCOUNTS	LEVEL1	2025-06-28 15:34:39.093527
24	2025-06-28 15:34:18.897	7	1400.00	0.00	Expense payment to adel - No remarks	EV20250005	\N	ACCOUNTS	LEVEL2	2025-06-28 15:34:39.093527
25	2025-06-28 15:37:35.297	11	15.00	0.00	Expense payment to adel - No remarks	EV20250006	\N	ACCOUNTS	LEVEL3	2025-06-28 15:37:47.081422
26	2025-06-28 15:37:35.297	1	0.00	15.00	Expense payment to adel - No remarks	EV20250006	\N	ACCOUNTS	CASH	2025-06-28 15:37:47.081422
27	2025-06-28 15:37:35.297	7	15.00	0.00	Expense payment to adel - No remarks	EV20250006	\N	ACCOUNTS	LEVEL1	2025-06-28 15:37:47.081422
28	2025-06-28 15:37:35.297	7	15.00	0.00	Expense payment to adel - No remarks	EV20250006	\N	ACCOUNTS	LEVEL2	2025-06-28 15:37:47.081422
29	2025-06-28 15:37:47.161	11	12.00	0.00	Expense payment to adel - No remarks	EV20250007	\N	ACCOUNTS	LEVEL3	2025-06-28 15:41:43.985047
30	2025-06-28 15:37:47.161	1	0.00	12.00	Expense payment to adel - No remarks	EV20250007	\N	ACCOUNTS	CASH	2025-06-28 15:41:43.985047
31	2025-06-28 15:37:47.161	7	12.00	0.00	Expense payment to adel - No remarks	EV20250007	\N	ACCOUNTS	LEVEL1	2025-06-28 15:41:43.985047
32	2025-06-28 15:37:47.161	7	12.00	0.00	Expense payment to adel - No remarks	EV20250007	\N	ACCOUNTS	LEVEL2	2025-06-28 15:41:43.985047
33	2025-06-28 15:42:37.583	11	12.00	0.00	Expense payment to afrt - No remarks	EV20250008	\N	ACCOUNTS	LEVEL3	2025-06-28 15:42:54.013862
34	2025-06-28 15:42:37.583	1	0.00	12.00	Expense payment to afrt - No remarks	EV20250008	\N	ACCOUNTS	CASH	2025-06-28 15:42:54.013862
35	2025-06-28 15:42:37.583	7	12.00	0.00	Expense payment to afrt - No remarks	EV20250008	\N	ACCOUNTS	LEVEL1	2025-06-28 15:42:54.013862
36	2025-06-28 15:42:37.583	7	12.00	0.00	Expense payment to afrt - No remarks	EV20250008	\N	ACCOUNTS	LEVEL2	2025-06-28 15:42:54.013862
37	2025-06-28 15:42:54.092	11	33.00	0.00	Expense payment to afrt - No remarks	EV20250009	\N	ACCOUNTS	LEVEL3	2025-06-28 15:48:13.445555
38	2025-06-28 15:42:54.092	1	0.00	33.00	Expense payment to afrt - No remarks	EV20250009	\N	ACCOUNTS	CASH	2025-06-28 15:48:13.445555
39	2025-06-28 15:42:54.092	7	33.00	0.00	Expense payment to afrt - No remarks	EV20250009	\N	ACCOUNTS	LEVEL1	2025-06-28 15:48:13.445555
40	2025-06-28 15:42:54.092	7	33.00	0.00	Expense payment to afrt - No remarks	EV20250009	\N	ACCOUNTS	LEVEL2	2025-06-28 15:48:13.445555
41	2025-06-28 15:48:13.55	11	10.00	0.00	Expense payment to afrt - No remarks	EV20250010	\N	ACCOUNTS	LEVEL3	2025-06-28 15:52:45.211685
42	2025-06-28 15:48:13.55	1	0.00	10.00	Expense payment to afrt - No remarks	EV20250010	\N	ACCOUNTS	CASH	2025-06-28 15:52:45.211685
43	2025-06-28 15:48:13.55	7	10.00	0.00	Expense payment to afrt - No remarks	EV20250010	\N	ACCOUNTS	LEVEL1	2025-06-28 15:52:45.211685
44	2025-06-28 15:48:13.55	7	10.00	0.00	Expense payment to afrt - No remarks	EV20250010	\N	ACCOUNTS	LEVEL2	2025-06-28 15:52:45.211685
45	2025-06-28 15:52:45.34	11	57.00	0.00	Expense payment to afrt - No remarks	EV20250011	\N	ACCOUNTS	LEVEL3	2025-06-28 15:54:25.039527
46	2025-06-28 15:52:45.34	1	0.00	57.00	Expense payment to afrt - No remarks	EV20250011	\N	ACCOUNTS	CASH	2025-06-28 15:54:25.039527
47	2025-06-28 15:52:45.34	7	57.00	0.00	Expense payment to afrt - No remarks	EV20250011	\N	ACCOUNTS	LEVEL1	2025-06-28 15:54:25.039527
48	2025-06-28 15:52:45.34	7	57.00	0.00	Expense payment to afrt - No remarks	EV20250011	\N	ACCOUNTS	LEVEL2	2025-06-28 15:54:25.039527
49	2025-07-06 22:32:51.949	11	100.00	0.00	Expense payment to fida - No remarks	EV20250012	\N	ACCOUNTS	LEVEL3	2025-07-06 22:33:09.384342
50	2025-07-06 22:32:51.949	1	0.00	100.00	Expense payment to fida - No remarks	EV20250012	\N	ACCOUNTS	CASH	2025-07-06 22:33:09.384342
51	2025-07-06 22:32:51.949	7	100.00	0.00	Expense payment to fida - No remarks	EV20250012	\N	ACCOUNTS	LEVEL1	2025-07-06 22:33:09.384342
52	2025-07-06 22:32:51.949	7	100.00	0.00	Expense payment to fida - No remarks	EV20250012	\N	ACCOUNTS	LEVEL2	2025-07-06 22:33:09.384342
53	2025-07-06 22:36:30.565	11	100.00	0.00	Expense payment to fida - No remarks	EV20250013	\N	ACCOUNTS	LEVEL3	2025-07-06 22:36:48.895236
54	2025-07-06 22:36:30.565	1	0.00	100.00	Expense payment to fida - No remarks	EV20250013	\N	ACCOUNTS	CASH	2025-07-06 22:36:48.895236
55	2025-07-06 22:36:30.565	7	100.00	0.00	Expense payment to fida - No remarks	EV20250013	\N	ACCOUNTS	LEVEL1	2025-07-06 22:36:48.895236
56	2025-07-06 22:36:30.565	7	100.00	0.00	Expense payment to fida - No remarks	EV20250013	\N	ACCOUNTS	LEVEL2	2025-07-06 22:36:48.895236
57	2025-07-06 22:38:45.188	11	99.00	0.00	Expense payment to ali - No remarks	EV20250014	\N	ACCOUNTS	LEVEL3	2025-07-06 22:39:01.233736
58	2025-07-06 22:38:45.188	1	0.00	99.00	Expense payment to ali - No remarks	EV20250014	\N	ACCOUNTS	CASH	2025-07-06 22:39:01.233736
59	2025-07-06 22:38:45.188	7	99.00	0.00	Expense payment to ali - No remarks	EV20250014	\N	ACCOUNTS	LEVEL1	2025-07-06 22:39:01.233736
60	2025-07-06 22:38:45.188	7	99.00	0.00	Expense payment to ali - No remarks	EV20250014	\N	ACCOUNTS	LEVEL2	2025-07-06 22:39:01.233736
61	2025-07-06 23:06:20.507	11	99.00	0.00	Expense payment to ali - No remarks	EV20250015	\N	ACCOUNTS	LEVEL3	2025-07-06 23:06:39.364405
62	2025-07-06 23:06:20.507	1	0.00	99.00	Expense payment to ali - No remarks	EV20250015	\N	ACCOUNTS	CASH	2025-07-06 23:06:39.364405
63	2025-07-06 23:06:20.507	7	99.00	0.00	Expense payment to ali - No remarks	EV20250015	\N	ACCOUNTS	LEVEL1	2025-07-06 23:06:39.364405
64	2025-07-06 23:06:20.507	7	99.00	0.00	Expense payment to ali - No remarks	EV20250015	\N	ACCOUNTS	LEVEL2	2025-07-06 23:06:39.364405
65	2025-07-06 23:08:07.563	11	100.00	0.00	Expense payment to LI - No remarks	EV20250016	\N	ACCOUNTS	LEVEL3	2025-07-06 23:08:47.289703
66	2025-07-06 23:08:07.563	1	0.00	100.00	Expense payment to LI - No remarks	EV20250016	\N	ACCOUNTS	CASH	2025-07-06 23:08:47.289703
67	2025-07-06 23:08:07.563	7	100.00	0.00	Expense payment to LI - No remarks	EV20250016	\N	ACCOUNTS	LEVEL1	2025-07-06 23:08:47.289703
68	2025-07-06 23:08:07.563	7	100.00	0.00	Expense payment to LI - No remarks	EV20250016	\N	ACCOUNTS	LEVEL2	2025-07-06 23:08:47.289703
69	2025-07-07 14:55:40.46	11	499.00	0.00	Expense payment to fida (Expense > Regular) - No remarks	EV20250017	\N	ACCOUNTS	LEVEL3	2025-07-07 14:56:00.867258
70	2025-07-07 14:55:40.46	1	0.00	499.00	Expense payment to fida (Expense > Regular) - No remarks	EV20250017	\N	ACCOUNTS	CASH	2025-07-07 14:56:00.867258
71	2025-07-07 14:55:40.46	7	499.00	0.00	Expense payment to fida (Expense > Regular) - No remarks	EV20250017	\N	ACCOUNTS	LEVEL1	2025-07-07 14:56:00.867258
72	2025-07-07 14:55:40.46	7	499.00	0.00	Expense payment to fida (Expense > Regular) - No remarks	EV20250017	\N	ACCOUNTS	LEVEL2	2025-07-07 14:56:00.867258
73	2025-07-07 15:19:53.806	11	600.00	0.00	Expense payment to gtyu (Expense > Regular > Petrol1) - No remarks	EV20250018	\N	ACCOUNTS	LEVEL3	2025-07-07 15:20:12.451271
74	2025-07-07 15:19:53.806	1	0.00	600.00	Expense payment to gtyu (Expense > Regular > Petrol1) - No remarks	EV20250018	\N	ACCOUNTS	CASH	2025-07-07 15:20:12.451271
75	2025-07-07 15:19:53.806	7	600.00	0.00	Expense payment to gtyu (Expense > Regular > Petrol1) - No remarks	EV20250018	\N	ACCOUNTS	LEVEL1	2025-07-07 15:20:12.451271
76	2025-07-07 15:19:53.806	7	600.00	0.00	Expense payment to gtyu (Expense > Regular > Petrol1) - No remarks	EV20250018	\N	ACCOUNTS	LEVEL2	2025-07-07 15:20:12.451271
77	2025-07-07 15:28:35.998	11	890.00	0.00	Expense payment to ghj (Expense > Regular > Petrol1) - No remarks	EV20250019	\N	ACCOUNTS	LEVEL3	2025-07-07 15:28:59.17125
78	2025-07-07 15:28:35.998	1	0.00	890.00	Expense payment to ghj (Expense > Regular > Petrol1) - No remarks	EV20250019	\N	ACCOUNTS	CASH	2025-07-07 15:28:59.17125
79	2025-07-07 15:28:35.998	7	890.00	0.00	Expense payment to ghj (Expense > Regular > Petrol1) - No remarks	EV20250019	\N	ACCOUNTS	LEVEL1	2025-07-07 15:28:59.17125
80	2025-07-07 15:28:35.998	7	890.00	0.00	Expense payment to ghj (Expense > Regular > Petrol1) - No remarks	EV20250019	\N	ACCOUNTS	LEVEL2	2025-07-07 15:28:59.17125
81	2025-07-07 15:31:10.935	11	700.00	0.00	Expense payment to bnm (Expense > Regular > Petrol1) - No remarks	EV20250020	\N	ACCOUNTS	LEVEL3	2025-07-07 15:37:37.91199
82	2025-07-07 15:31:10.935	1	0.00	700.00	Expense payment to bnm (Expense > Regular > Petrol1) - No remarks	EV20250020	\N	ACCOUNTS	CASH	2025-07-07 15:37:37.91199
83	2025-07-07 15:31:10.935	7	700.00	0.00	Expense payment to bnm (Expense > Regular > Petrol1) - No remarks	EV20250020	\N	ACCOUNTS	LEVEL1	2025-07-07 15:37:37.91199
84	2025-07-07 15:31:10.935	7	700.00	0.00	Expense payment to bnm (Expense > Regular > Petrol1) - No remarks	EV20250020	\N	ACCOUNTS	LEVEL2	2025-07-07 15:37:37.91199
85	2025-07-07 15:39:12.771	11	699.00	0.00	Expense payment to ali (Expense > Regular > Petrol1) - No remarks	EV20250021	\N	ACCOUNTS	LEVEL3	2025-07-07 15:39:32.056119
86	2025-07-07 15:39:12.771	1	0.00	699.00	Expense payment to ali (Expense > Regular > Petrol1) - No remarks	EV20250021	\N	ACCOUNTS	CASH	2025-07-07 15:39:32.056119
87	2025-07-07 15:39:12.771	7	699.00	0.00	Expense payment to ali (Expense > Regular > Petrol1) - No remarks	EV20250021	\N	ACCOUNTS	LEVEL1	2025-07-07 15:39:32.056119
88	2025-07-07 15:39:12.771	7	699.00	0.00	Expense payment to ali (Expense > Regular > Petrol1) - No remarks	EV20250021	\N	ACCOUNTS	LEVEL2	2025-07-07 15:39:32.056119
\.


--
-- Data for Name: ledgers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledgers (id, account_id, account_type, opening_balance, balance_type, amount, transaction_date, created_at, updated_at) FROM stdin;
17	7	LEVEL3	0.00	DEBIT	0.00	2025-06-28 14:06:16.228922	2025-06-28 14:06:16.228922	2025-06-28 14:06:16.228922
16	5	LEVEL2	0.00	DEBIT	0.00	2025-06-28 14:06:02.198046	2025-06-28 14:06:02.198046	2025-06-28 14:06:02.198046
18	6	LEVEL1	0.00	DEBIT	0.00	2025-06-28 14:06:25.502073	2025-06-28 14:06:25.502073	2025-06-28 14:06:25.502073
20	8	LEVEL3	0.00	DEBIT	0.00	2025-06-28 14:06:49.237034	2025-06-28 14:06:49.237034	2025-06-28 14:06:49.237034
19	6	LEVEL2	0.00	DEBIT	0.00	2025-06-28 14:06:36.212237	2025-06-28 14:06:36.212237	2025-06-28 14:06:36.212237
15	5	LEVEL1	0.00	DEBIT	0.00	2025-06-28 14:05:49.099681	2025-06-28 14:05:49.099681	2025-06-28 14:05:49.099681
23	9	LEVEL3	0.00	DEBIT	0.00	2025-06-28 14:19:16.90545	2025-06-28 14:19:16.90545	2025-06-28 14:19:16.90545
24	11	LEVEL3	0.00	DEBIT	7135.00	2025-06-28 15:00:11.98864	2025-06-28 15:00:11.98864	2025-06-28 15:00:11.98864
21	7	LEVEL1	0.00	DEBIT	7135.00	2025-06-28 14:18:49.26688	2025-06-28 14:18:49.26688	2025-06-28 14:18:49.26688
22	7	LEVEL2	0.00	DEBIT	7135.00	2025-06-28 14:19:01.965002	2025-06-28 14:19:01.965002	2025-06-28 14:19:01.965002
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
\.


--
-- Data for Name: maintenance_issues; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_issues (id, department_code, issue_date, created_at) FROM stdin;
\.


--
-- Data for Name: monthly_price_averages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_price_averages (id, item_type, month, year, average_price, created_at) FROM stdin;
1	Petti	6	2025	50.00	2025-07-01 00:00:01.111182
\.


--
-- Data for Name: monthly_salary_totals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_salary_totals (id, month, year, total_amount, payment_date, payment_status) FROM stdin;
\.


--
-- Data for Name: paper_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paper_types (id, name, description, created_at) FROM stdin;
2	Super		2025-07-07 16:05:51.944065
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, payment_date, payment_mode, account_id, account_type, amount, payment_type, remarks, created_at, receiver_name, voucher_no, is_tax_payment, created_by, processed_by_role, bank_account_id) FROM stdin;
22	2025-06-28 14:07:59.453	CASH	8	CUSTOMER	10000.00	RECEIVED		2025-06-28 14:10:29.807657	ali	RV20250001	f	\N	ACCOUNTS	\N
23	2025-06-28 14:11:35.022	CASH	7	SUPPLIER	5000.00	ISSUED		2025-06-28 14:11:48.45832	ali	PV20250001	f	\N	ACCOUNTS	\N
24	2025-07-06 00:54:45.033	CASH	8	CUSTOMER	1000.00	RECEIVED		2025-07-06 00:55:03.006922	ali	RV20250002	f	\N	ACCOUNTS	\N
25	2025-07-06 00:59:37.807	CASH	8	CUSTOMER	1000.00	RECEIVED		2025-07-06 00:59:58.394038	ali	RV20250003	f	\N	ACCOUNTS	\N
26	2025-07-06 01:48:08.664	CASH	8	CUSTOMER	500.00	RECEIVED		2025-07-06 01:48:25.717389	adeel	RV20250004	f	\N	ACCOUNTS	\N
27	2025-07-06 22:48:10.874	CASH	8	CUSTOMER	109.00	RECEIVED		2025-07-06 22:48:27.708073	ali	RV20250005	f	\N	ACCOUNTS	\N
\.


--
-- Data for Name: pricing_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pricing_entries (id, entry_type, reference_id, status, quantity, unit, price_per_unit, total_amount, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: production; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production (id, date_time, paper_type, total_weight, total_reels, boiler_fuel_type, boiler_fuel_quantity, boiler_fuel_cost, total_yield_percentage, created_at, electricity_units, electricity_unit_price, electricity_cost) FROM stdin;
3	2025-07-07 16:05:43.66	Super	999.00	0	Boiler Fuel (Toori)	10000.00	100000.00	\N	2025-07-07 16:07:31.028571	1000.00	45.00	45000.00
\.


--
-- Data for Name: production_paper_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_paper_types (id, production_id, paper_type, total_weight, boiler_fuel_cost, electricity_cost) FROM stdin;
3	3	Super	999.00	0.00	0.00
\.


--
-- Data for Name: production_recipe; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.production_recipe (id, production_id, raddi_type, percentage_used, quantity_used, yield_percentage) FROM stdin;
4	3	Petti	100.00	1248.75	80.00
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
6	Petti	-1248.75	PRODUCTION_USAGE	PRODUCTION	3	2025-07-07 16:05:43.66	2025-07-07 16:07:31.028571
7	Boiler Fuel (Toori)	-10000.00	PRODUCTION_USAGE	PRODUCTION	3	2025-07-07 16:05:43.66	2025-07-07 16:07:31.028571
\.


--
-- Data for Name: store_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_entries (id, grn_number, entry_type, item_id, quantity, unit, vendor_id, department, issued_to, vehicle_number, driver_name, date_time, remarks, created_at) FROM stdin;
\.


--
-- Data for Name: store_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_items (id, item_name, item_code, category, unit, current_stock, created_at) FROM stdin;
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

COPY public.transactions (id, transaction_date, account_id, reference_no, entry_type, amount, description, item_name, quantity, unit, price_per_unit, created_at, unified_account_id) FROM stdin;
66	2025-06-28 14:07:59.453	8	RV20250001	CREDIT	10000.00	Payment received in cash	\N	\N	\N	\N	2025-06-28 14:10:29.807657	8
67	2025-06-28 14:11:35.022	7	PV20250001	DEBIT	5000.00	Payment issued in cash	\N	\N	\N	\N	2025-06-28 14:11:48.45832	7
68	2025-06-28 14:14:04.655	7	GRN-SP-250628-055	CREDIT	500000.00	Purchase	Petti	10000.00	KG	50.00	2025-06-28 14:14:04.648499	7
71	2025-07-06 00:54:45.033	8	RV20250002	CREDIT	1000.00	Payment received in cash	\N	\N	\N	\N	2025-07-06 00:55:03.006922	\N
72	2025-07-06 00:59:37.807	8	RV20250003	CREDIT	1000.00	Payment received in cash	\N	\N	\N	\N	2025-07-06 00:59:58.394038	8
73	2025-07-06 01:48:08.664	8	RV20250004	CREDIT	500.00	Payment received in cash	\N	\N	\N	\N	2025-07-06 01:48:25.717389	8
74	2025-07-06 22:38:45.188	11	EV20250014	DEBIT	99.00	Expense payment to ali	\N	\N	\N	\N	2025-07-06 22:39:01.233736	10
75	2025-07-06 22:48:10.874	8	RV20250005	CREDIT	109.00	Payment received in cash	\N	\N	\N	\N	2025-07-06 22:48:27.708073	8
76	2025-07-06 23:06:20.507	11	EV20250015	DEBIT	99.00	Expense payment to ali ( >  > Petrol1)	\N	\N	\N	\N	2025-07-06 23:06:39.364405	10
77	2025-07-06 23:08:07.563	11	EV20250016	DEBIT	100.00	Expense payment to LI ( >  > Petrol1)	\N	\N	\N	\N	2025-07-06 23:08:47.289703	10
78	2025-07-07 14:55:40.46	11	EV20250017	DEBIT	499.00	Expense payment to fida ( >  > Petrol1)	\N	\N	\N	\N	2025-07-07 14:56:00.867258	10
79	2025-07-07 15:19:53.806	11	EV20250018	DEBIT	600.00	Expense payment to gtyu ( >  > Petrol1)	\N	\N	\N	\N	2025-07-07 15:20:12.451271	10
80	2025-07-07 15:28:35.998	11	EV20250019	DEBIT	890.00	Expense payment to ghj ( >  > Petrol1)	\N	\N	\N	\N	2025-07-07 15:28:59.17125	10
81	2025-07-07 15:31:10.935	11	EV20250020	DEBIT	700.00	Expense payment to bnm ( >  > Petrol1)	\N	\N	\N	\N	2025-07-07 15:37:37.91199	10
82	2025-07-07 15:39:12.771	11	EV20250021	DEBIT	699.00	Expense payment to ali ( >  > Petrol1)	\N	\N	\N	\N	2025-07-07 15:39:32.056119	10
83	2025-07-07 15:41:44.015	8	LV-250707-737	CREDIT	500.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:41:44.030876	8
84	2025-07-07 15:41:44.015	7	LV-250707-737	DEBIT	500.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:41:44.030876	3
85	2025-07-07 15:50:03.587	8	LV-250707-988	CREDIT	5000.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:50:03.623421	8
86	2025-07-07 15:50:03.587	7	LV-250707-988	DEBIT	5000.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:50:03.623421	3
87	2025-07-07 15:55:27.535	8	LV-250707-362	CREDIT	670.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:55:27.560375	8
88	2025-07-07 15:55:27.535	7	LV-250707-362	DEBIT	670.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 15:55:27.560375	3
89	2025-07-07 16:01:09.687	8	LV-250707-258	CREDIT	680.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 16:01:09.717646	8
90	2025-07-07 16:01:09.687	7	LV-250707-258	DEBIT	680.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 16:01:09.717646	3
91	2025-07-07 16:04:16.742	8	LV-250707-285	CREDIT	600.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 16:04:16.775298	8
92	2025-07-07 16:04:16.742	7	LV-250707-285	DEBIT	600.00	Receivables > customer > RS to Receivables > Raddi > Sajjad	\N	\N	\N	\N	2025-07-07 16:04:16.775298	7
\.


--
-- Data for Name: workers_salary_totals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.workers_salary_totals (id, month, year, total_amount, created_at) FROM stdin;
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 5, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 2, true);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_transactions_id_seq', 6, true);


--
-- Name: cash_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_tracking_id_seq', 2, true);


--
-- Name: cash_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_transactions_id_seq', 34, true);


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_id_seq', 1, false);


--
-- Name: chart_of_accounts_level1_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level1_id_seq', 7, true);


--
-- Name: chart_of_accounts_level2_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level2_id_seq', 7, true);


--
-- Name: chart_of_accounts_level3_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chart_of_accounts_level3_id_seq', 11, true);


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

SELECT pg_catalog.setval('public.expenses_id_seq', 26, true);


--
-- Name: final_settlements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.final_settlements_id_seq', 1, false);


--
-- Name: gate_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_id_seq', 32, true);


--
-- Name: gate_entries_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.gate_entries_pricing_id_seq', 27, true);


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

SELECT pg_catalog.setval('public.item_types_id_seq', 4, true);


--
-- Name: leave_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_applications_id_seq', 1, false);


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledger_entries_id_seq', 88, true);


--
-- Name: ledgers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledgers_id_seq', 24, true);


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

SELECT pg_catalog.setval('public.monthly_price_averages_id_seq', 186, true);


--
-- Name: monthly_salary_totals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.monthly_salary_totals_id_seq', 1, true);


--
-- Name: paper_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paper_types_id_seq', 2, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 27, true);


--
-- Name: pricing_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pricing_entries_id_seq', 38, true);


--
-- Name: production_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_id_seq', 3, true);


--
-- Name: production_paper_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_paper_types_id_seq', 3, true);


--
-- Name: production_recipe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.production_recipe_id_seq', 4, true);


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

SELECT pg_catalog.setval('public.stock_adjustments_id_seq', 7, true);


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

SELECT pg_catalog.setval('public.transactions_id_seq', 92, true);


--
-- Name: unified_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.unified_account_id_seq', 10, true);


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
-- Name: chart_of_accounts_level1 unique_level1_unified_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level1
    ADD CONSTRAINT unique_level1_unified_id UNIQUE (unified_id);


--
-- Name: chart_of_accounts_level2 unique_level2_unified_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level2
    ADD CONSTRAINT unique_level2_unified_id UNIQUE (unified_id);


--
-- Name: chart_of_accounts_level3 unique_level3_unified_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chart_of_accounts_level3
    ADD CONSTRAINT unique_level3_unified_id UNIQUE (unified_id);


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
-- Name: idx_transactions_unified_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_unified_account_id ON public.transactions USING btree (unified_account_id);


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
-- Name: chart_of_accounts_level1 trigger_assign_unified_id_level1; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assign_unified_id_level1 BEFORE INSERT ON public.chart_of_accounts_level1 FOR EACH ROW EXECUTE FUNCTION public.assign_unified_id_level1();


--
-- Name: chart_of_accounts_level2 trigger_assign_unified_id_level2; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assign_unified_id_level2 BEFORE INSERT ON public.chart_of_accounts_level2 FOR EACH ROW EXECUTE FUNCTION public.assign_unified_id_level2();


--
-- Name: chart_of_accounts_level3 trigger_assign_unified_id_level3; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assign_unified_id_level3 BEFORE INSERT ON public.chart_of_accounts_level3 FOR EACH ROW EXECUTE FUNCTION public.assign_unified_id_level3();


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

