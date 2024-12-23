-- Функция для триггера удаления книги
CREATE OR REPLACE FUNCTION delete_related_data_for_deleted_book()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем наличие активных абонементов
    IF EXISTS (
        SELECT 1 
        FROM loans 
        WHERE library_id = OLD.library_id 
        AND book_id = OLD.book_id 
        AND return_date IS NULL
    ) THEN
        RAISE EXCEPTION 'Невозможно удалить книгу с активными абонементами';
    END IF;

    -- Если активных абонементов нет, удаляем связанные записи
    DELETE FROM loans WHERE library_id = OLD.library_id AND book_id = OLD.book_id;
    DELETE FROM book_topics WHERE book_id = OLD.book_id AND library_id = OLD.library_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS delete_book_related_data_trigger ON books;
CREATE TRIGGER delete_book_related_data_trigger
BEFORE DELETE ON books
FOR EACH ROW
EXECUTE FUNCTION delete_related_data_for_deleted_book(); 