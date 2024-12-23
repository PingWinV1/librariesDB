-- Удаляем триггер
DROP TRIGGER IF EXISTS delete_book_related_data_trigger ON books;

-- Удаляем функцию триггера
DROP FUNCTION IF EXISTS delete_related_data_for_deleted_book(); 