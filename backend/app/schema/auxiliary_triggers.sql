-- Триггер для логирования изменений в таблице books
CREATE TABLE IF NOT EXISTS books_audit (
    id SERIAL PRIMARY KEY,
    action VARCHAR(10),
    library_id INTEGER,
    book_id INTEGER,
    title VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(50)
);

CREATE OR REPLACE FUNCTION log_books_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO books_audit (action, library_id, book_id, title, changed_by)
        VALUES ('INSERT', NEW.library_id, NEW.book_id, NEW.title, CURRENT_USER);
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO books_audit (action, library_id, book_id, title, changed_by)
        VALUES ('UPDATE', NEW.library_id, NEW.book_id, NEW.title, CURRENT_USER);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO books_audit (action, library_id, book_id, title, changed_by)
        VALUES ('DELETE', OLD.library_id, OLD.book_id, OLD.title, CURRENT_USER);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON books
FOR EACH ROW EXECUTE FUNCTION log_books_changes();

-- Триггер для автоматического обновления даты возврата в абонементах
CREATE OR REPLACE FUNCTION update_loan_return_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
        -- Проверяем, что дата возврата не раньше даты выдачи
        IF NEW.return_date < NEW.issue_date THEN
            RAISE EXCEPTION 'Дата возврата не может быть раньше даты выдачи';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loan_return_date_trigger
BEFORE UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION update_loan_return_date();

-- Триггер для проверки количества книг при обновлении
CREATE OR REPLACE FUNCTION check_book_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, что новое количество не меньше количества выданных книг
    IF NEW.quantity < (
        SELECT COUNT(*)
        FROM loans
        WHERE library_id = NEW.library_id
        AND book_id = NEW.book_id
        AND return_date IS NULL
    ) THEN
        RAISE EXCEPTION 'Нельзя установить количество меньше числа выданных книг';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER book_quantity_check_trigger
BEFORE UPDATE OF quantity ON books
FOR EACH ROW EXECUTE FUNCTION check_book_quantity();

-- Триггер для автоматического заполнения даты выдачи
CREATE OR REPLACE FUNCTION set_loan_issue_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.issue_date IS NULL THEN
        NEW.issue_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loan_issue_date_trigger
BEFORE INSERT ON loans
FOR EACH ROW EXECUTE FUNCTION set_loan_issue_date();

-- Триггер для проверки уникальности названия библиотеки
CREATE OR REPLACE FUNCTION check_library_name()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM libraries 
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
        AND library_id != COALESCE(NEW.library_id, -1)
    ) THEN
        RAISE EXCEPTION 'Библиотека с таким названием уже существует';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER library_name_check_trigger
BEFORE INSERT OR UPDATE ON libraries
FOR EACH ROW EXECUTE FUNCTION check_library_name(); 