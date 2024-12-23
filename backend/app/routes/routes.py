from flask import Blueprint, jsonify, request
from .. import db

bp = Blueprint('main', __name__)

@bp.route('/libraries', methods=['GET'])
def get_libraries():
    try:
        result = db.session.execute('SELECT * FROM libraries ORDER BY name')
        libraries = [dict(row) for row in result]
        return jsonify(libraries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/genres', methods=['GET'])
def get_genres():
    try:
        result = db.session.execute('SELECT * FROM genres ORDER BY name')
        genres = [dict(row) for row in result]
        return jsonify(genres)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/readers', methods=['GET'])
def get_readers():
    try:
        result = db.session.execute('SELECT * FROM readers ORDER BY full_name')
        readers = [dict(row) for row in result]
        return jsonify(readers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/loans', methods=['GET'])
def get_loans():
    try:
        query = '''
            SELECT 
                l.library_id,
                lib.name as library_name,
                l.book_id,
                b.title as book_title,
                l.reader_id,
                r.full_name as reader_name,
                TO_CHAR(l.issue_date, 'YYYY-MM-DD') as issue_date,
                TO_CHAR(l.due_date, 'YYYY-MM-DD') as due_date,
                CASE 
                    WHEN l.return_date IS NULL THEN 'не возвращена'
                    ELSE TO_CHAR(l.return_date, 'YYYY-MM-DD')
                END as return_date,
                l.deposit
            FROM loans l
            JOIN libraries lib ON l.library_id = lib.library_id
            JOIN books b ON l.library_id = b.library_id AND l.book_id = b.book_id
            JOIN readers r ON l.reader_id = r.reader_id
            ORDER BY l.issue_date DESC
        '''
        result = db.session.execute(query)
        loans = [dict(row) for row in result]
        return jsonify(loans)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/add/loan', methods=['POST'])
def add_loan():
    try:
        data = request.json
        query = '''
            INSERT INTO loans (
                library_id, book_id, reader_id,
                issue_date, due_date, return_date, deposit
            ) VALUES (
                :library_id, :book_id, :reader_id,
                :issue_date, :due_date, NULL, :deposit
            )
        '''
        db.session.execute(query, data)
        db.session.commit()
        return jsonify({'message': 'Абонемент успешно добавлен'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/available-books', methods=['GET'])
def get_available_books():
    try:
        query = '''
            WITH book_availability AS (
                SELECT 
                    b.title as book_title,
                    b.author as book_author,
                    l.name as library_name,
                    b.quantity - COALESCE(COUNT(ln.book_id) FILTER (WHERE ln.return_date IS NULL), 0) as available_quantity,
                    b.quantity as total_quantity
                FROM books b
                JOIN libraries l ON b.library_id = l.library_id
                LEFT JOIN loans ln ON b.library_id = ln.library_id AND b.book_id = ln.book_id
                GROUP BY b.library_id, b.book_id, b.title, b.author, l.name, b.quantity
            )
            SELECT *
            FROM book_availability
            WHERE available_quantity > 0
            ORDER BY library_name, book_title
        '''
        result = db.session.execute(query)
        books = [dict(row) for row in result]
        return jsonify(books)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/add/reader', methods=['POST'])
def add_reader():
    try:
        data = request.json
        query = '''
            INSERT INTO readers (full_name, address, phone)
            VALUES (:full_name, :address, :phone)
            RETURNING reader_id
        '''
        result = db.session.execute(query, data)
        reader_id = result.scalar()
        db.session.commit()
        return jsonify({'message': 'Читатель успешно добавлен', 'reader_id': reader_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/add/library', methods=['POST'])
def add_library():
    try:
        data = request.json
        query = '''
            INSERT INTO libraries (name, address)
            VALUES (:name, :address)
            RETURNING library_id
        '''
        result = db.session.execute(query, data)
        library_id = result.scalar()
        db.session.commit()
        return jsonify({'message': 'Библиотека успешно добавлена', 'library_id': library_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/reader/<int:reader_id>', methods=['DELETE'])
def delete_reader(reader_id):
    try:
        # Проверяем наличие активных абонементов
        check_query = '''
            SELECT 1 FROM loans
            WHERE reader_id = :reader_id
            AND return_date IS NULL
        '''
        result = db.session.execute(check_query, {'reader_id': reader_id})
        if result.fetchone():
            return jsonify({'error': 'Невозможно удалить читателя с активными абонементами'}), 400

        query = 'DELETE FROM readers WHERE reader_id = :reader_id'
        result = db.session.execute(query, {'reader_id': reader_id})
        if result.rowcount == 0:
            return jsonify({'error': 'Читатель не найден'}), 404

        db.session.commit()
        return jsonify({'message': 'Читатель успешно удален'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/library/<int:library_id>', methods=['DELETE'])
def delete_library(library_id):
    try:
        # Проверяем наличие книг в библиотеке
        check_query = 'SELECT 1 FROM books WHERE library_id = :library_id'
        result = db.session.execute(check_query, {'library_id': library_id})
        if result.fetchone():
            return jsonify({'error': 'Невозможно удалить библиотеку, содержащую книги'}), 400

        query = 'DELETE FROM libraries WHERE library_id = :library_id'
        result = db.session.execute(query, {'library_id': library_id})
        if result.rowcount == 0:
            return jsonify({'error': 'Библиотека не найдена'}), 404

        db.session.commit()
        return jsonify({'message': 'Библиотека успешно удалена'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/edit/<table>', methods=['PUT'])
def edit_data(table):
    try:
        data = request.json
        column = data['column']
        value = data['value']
        row_data = data['rowData']
        
        if table == 'books':
            query = f'''
                UPDATE books
                SET {column} = :value
                WHERE library_id = :library_id AND book_id = :book_id
            '''
            params = {
                'value': value,
                'library_id': row_data['library_id'],
                'book_id': row_data['book_id']
            }
        elif table == 'readers':
            query = f'''
                UPDATE readers
                SET {column} = :value
                WHERE reader_id = :reader_id
            '''
            params = {
                'value': value,
                'reader_id': row_data['reader_id']
            }
        elif table == 'libraries':
            query = f'''
                UPDATE libraries
                SET {column} = :value
                WHERE library_id = :library_id
            '''
            params = {
                'value': value,
                'library_id': row_data['library_id']
            }
        else:
            return jsonify({'error': 'Таблица не поддерживает редактирование'}), 400
            
        result = db.session.execute(query, params)
        if result.rowcount == 0:
            return jsonify({'error': 'Запись не найдена'}), 404
            
        db.session.commit()
        return jsonify({'message': 'Данные успешно обновлены'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/books', methods=['GET'])
def get_books():
    try:
        query = '''
            SELECT 
                b.library_id,
                b.book_id,
                b.genre_id,
                g.name as genre_name,
                b.author,
                b.title,
                b.publisher,
                b.publication_place,
                b.publication_year,
                b.quantity,
                l.name as library_name
            FROM books b
            JOIN libraries l ON b.library_id = l.library_id
            JOIN genres g ON b.genre_id = g.genre_id
            ORDER BY b.title, b.author
        '''
        result = db.session.execute(query)
        books = [dict(row) for row in result]
        return jsonify(books)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/add/book', methods=['POST'])
def add_book():
    try:
        data = request.json
        
        # Проверяем уникальность комбинации library_id, title, author, publication_year
        check_query = '''
            SELECT 1 FROM books 
            WHERE library_id = :library_id 
            AND title = :title 
            AND author = :author 
            AND publication_year = :publication_year
        '''
        result = db.session.execute(check_query, data)
        if result.fetchone():
            return jsonify({'error': 'Такая книга уже существует в этой библиотеке'}), 400

        # Плучаем следующий book_id для данной библиот��ки
        next_id_query = '''
            SELECT COALESCE(MAX(book_id), 0) + 1
            FROM books
            WHERE library_id = :library_id
        '''
        result = db.session.execute(next_id_query, {'library_id': data['library_id']})
        next_book_id = result.scalar()

        # Добавляем книгу
        insert_query = '''
            INSERT INTO books (
                library_id, book_id, genre_id, author, title,
                publisher, publication_place, publication_year, quantity
            ) VALUES (
                :library_id, :book_id, :genre_id, :author, :title,
                :publisher, :publication_place, :publication_year, :quantity
            )
        '''
        db.session.execute(insert_query, {**data, 'book_id': next_book_id})
        db.session.commit()
        return jsonify({'message': 'Книга успешно добавлена'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/book/<int:library_id>/<int:book_id>', methods=['DELETE'])
def delete_book(library_id, book_id):
    try:
        # Проверяем наличие активных абонементов
        check_query = '''
            SELECT 1 FROM loans
            WHERE library_id = :library_id
            AND book_id = :book_id
            AND return_date IS NULL
        '''
        result = db.session.execute(check_query, {
            'library_id': library_id,
            'book_id': book_id
        })
        if result.fetchone():
            return jsonify({'error': 'Невозможно удалить книгу с активными абонементами'}), 400

        # Удаляем связанные записи
        delete_loans_query = '''
            DELETE FROM loans 
            WHERE library_id = :library_id AND book_id = :book_id
        '''
        db.session.execute(delete_loans_query, {
            'library_id': library_id,
            'book_id': book_id
        })

        delete_topics_query = '''
            DELETE FROM book_topics 
            WHERE library_id = :library_id AND book_id = :book_id
        '''
        db.session.execute(delete_topics_query, {
            'library_id': library_id,
            'book_id': book_id
        })

        # Удаляем книгу
        query = '''
            DELETE FROM books
            WHERE library_id = :library_id AND book_id = :book_id
        '''
        result = db.session.execute(query, {
            'library_id': library_id,
            'book_id': book_id
        })
        if result.rowcount == 0:
            return jsonify({'error': 'Книга не найдена'}), 404

        db.session.commit()
        return jsonify({'message': 'Книга успешно удалена'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/topics', methods=['GET'])
def get_topics():
    try:
        result = db.session.execute('SELECT * FROM topics ORDER BY name')
        topics = [dict(row) for row in result]
        return jsonify(topics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/add/topic', methods=['POST'])
def add_topic():
    try:
        data = request.json
        query = '''
            INSERT INTO topics (name)
            VALUES (:name)
            RETURNING topic_id
        '''
        result = db.session.execute(query, data)
        topic_id = result.scalar()
        db.session.commit()
        return jsonify({'message': 'Тематика успешно добавлена', 'topic_id': topic_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/topic/<int:topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    try:
        # Проверяем наличие книг с этой тематикой
        check_query = '''
            SELECT 1 FROM book_topics 
            WHERE topic_id = :topic_id
        '''
        result = db.session.execute(check_query, {'topic_id': topic_id})
        if result.fetchone():
            return jsonify({'error': 'Невозможно удалить тематику, которая используется в книгах'}), 400

        query = 'DELETE FROM topics WHERE topic_id = :topic_id'
        result = db.session.execute(query, {'topic_id': topic_id})
        if result.rowcount == 0:
            return jsonify({'error': 'Тематика не найдена'}), 404

        db.session.commit()
        return jsonify({'message': 'Тематика успешно удалена'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/book-topics-detailed', methods=['GET'])
def get_book_topics_detailed():
    try:
        query = '''
            SELECT 
                b.title as book_title,
                b.author as book_author,
                COALESCE(STRING_AGG(t.name, ', ' ORDER BY t.name), 'Нет тематик') as topic_names
            FROM books b
            LEFT JOIN book_topics bt ON b.library_id = bt.library_id AND b.book_id = bt.book_id
            LEFT JOIN topics t ON bt.topic_id = t.topic_id
            GROUP BY b.library_id, b.book_id, b.title, b.author
            ORDER BY b.title, b.author
        '''
        result = db.session.execute(query)
        topics = [dict(row) for row in result]
        return jsonify(topics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/book-genres-count', methods=['GET'])
def get_book_genres_count():
    try:
        query = '''
            SELECT 
                g.name as genre_name,
                COUNT(b.book_id) as book_count
            FROM genres g
            LEFT JOIN books b ON g.genre_id = b.genre_id
            GROUP BY g.genre_id, g.name
            ORDER BY book_count DESC, g.name
        '''
        result = db.session.execute(query)
        counts = [dict(row) for row in result]
        return jsonify(counts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/library-books-quantity', methods=['GET'])
def get_library_books_quantity():
    try:
        query = '''
            SELECT 
                l.name as library_name,
                COALESCE(SUM(b.quantity), 0) as total_books
            FROM libraries l
            LEFT JOIN books b ON l.library_id = b.library_id
            GROUP BY l.library_id, l.name
            ORDER BY total_books DESC, l.name
        '''
        result = db.session.execute(query)
        quantities = [dict(row) for row in result]
        return jsonify(quantities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/readers-with-loans', methods=['GET'])
def get_readers_with_loans():
    try:
        query = '''
            SELECT 
                r.full_name as reader_name,
                r.phone as reader_phone,
                l.library_id,
                COUNT(l.book_id) FILTER (WHERE l.return_date IS NULL) as current_loans_count,
                r.address as reader_address,
                STRING_AGG(DISTINCT b.title, ', ' ORDER BY b.title) 
                    FILTER (WHERE l.return_date IS NULL) as borrowed_books
            FROM readers r
            JOIN loans l ON r.reader_id = l.reader_id
            JOIN books b ON l.library_id = b.library_id AND l.book_id = b.book_id
            WHERE l.return_date IS NULL
            GROUP BY r.reader_id, r.full_name, r.phone, l.library_id, r.address
            HAVING COUNT(l.book_id) FILTER (WHERE l.return_date IS NULL) > 0
            ORDER BY r.full_name
        '''
        result = db.session.execute(query)
        readers = [dict(row) for row in result]
        return jsonify(readers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/add/book-topic', methods=['POST'])
def add_book_topic():
    try:
        data = request.json
        library_id = data.get('library_id')
        book_id = data.get('book_id')
        topic_id = data.get('topic_id')

        # Проверяем существование книги
        check_book_query = '''
            SELECT 1 FROM books 
            WHERE library_id = :library_id AND book_id = :book_id
        '''
        result = db.session.execute(check_book_query, {
            'library_id': library_id,
            'book_id': book_id
        })
        if not result.fetchone():
            return jsonify({'error': 'Книга не найдена'}), 404

        # Проверяем, не присвоена ли уже эта тематика книге
        check_topic_query = '''
            SELECT 1 FROM book_topics 
            WHERE library_id = :library_id 
            AND book_id = :book_id 
            AND topic_id = :topic_id
        '''
        result = db.session.execute(check_topic_query, {
            'library_id': library_id,
            'book_id': book_id,
            'topic_id': topic_id
        })
        if result.fetchone():
            return jsonify({'error': 'Эта тематика уже присвоена данной книге'}), 400

        # Добавляем тематику книге
        insert_query = '''
            INSERT INTO book_topics (library_id, book_id, topic_id)
            VALUES (:library_id, :book_id, :topic_id)
        '''
        db.session.execute(insert_query, {
            'library_id': library_id,
            'book_id': book_id,
            'topic_id': topic_id
        })
        
        db.session.commit()
        return jsonify({'message': 'Тематика успешно присвоена книге'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/book-topic', methods=['DELETE'])
def delete_book_topic():
    try:
        data = request.json
        library_id = data.get('library_id')
        book_id = data.get('book_id')
        topic_id = data.get('topic_id')

        # Проверяем существование связи книга-тематика
        check_query = '''
            SELECT 1 FROM book_topics 
            WHERE library_id = :library_id 
            AND book_id = :book_id 
            AND topic_id = :topic_id
        '''
        result = db.session.execute(check_query, {
            'library_id': library_id,
            'book_id': book_id,
            'topic_id': topic_id
        })
        if not result.fetchone():
            return jsonify({'error': 'У книги нет такой тематики'}), 404

        # Удаляем тематику у книги
        delete_query = '''
            DELETE FROM book_topics 
            WHERE library_id = :library_id 
            AND book_id = :book_id 
            AND topic_id = :topic_id
        '''
        db.session.execute(delete_query, {
            'library_id': library_id,
            'book_id': book_id,
            'topic_id': topic_id
        })
        
        db.session.commit()
        return jsonify({'message': 'Тематика успешно удалена у книги'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/books-with-topics', methods=['GET'])
def get_books_with_topics():
    try:
        query = '''
            SELECT DISTINCT
                b.library_id,
                b.book_id,
                b.title,
                b.author,
                l.name as library_name
            FROM books b
            JOIN libraries l ON b.library_id = l.library_id
            JOIN book_topics bt ON b.library_id = bt.library_id AND b.book_id = bt.book_id
            ORDER BY b.title, b.author
        '''
        result = db.session.execute(query)
        books = [dict(row) for row in result]
        return jsonify(books)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/book-topics/<int:library_id>/<int:book_id>', methods=['GET'])
def get_book_topics(library_id, book_id):
    try:
        query = '''
            SELECT 
                t.topic_id,
                t.name
            FROM book_topics bt
            JOIN topics t ON bt.topic_id = t.topic_id
            WHERE bt.library_id = :library_id 
            AND bt.book_id = :book_id
            ORDER BY t.name
        '''
        result = db.session.execute(query, {
            'library_id': library_id,
            'book_id': book_id
        })
        topics = [dict(row) for row in result]
        return jsonify(topics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/delete/genre/<int:genre_id>', methods=['DELETE'])
def delete_genre(genre_id):
    try:
        # Проверяем наличие книг с этим жанром
        check_query = '''
            SELECT 1 FROM books 
            WHERE genre_id = :genre_id
        '''
        result = db.session.execute(check_query, {'genre_id': genre_id})
        if result.fetchone():
            return jsonify({'error': 'Невозможно удалить жанр, который используется в книгах'}), 400

        query = 'DELETE FROM genres WHERE genre_id = :genre_id'
        result = db.session.execute(query, {'genre_id': genre_id})
        if result.rowcount == 0:
            return jsonify({'error': 'Жанр не найден'}), 404

        db.session.commit()
        return jsonify({'message': 'Жанр успешно удален'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/add/reader-with-loan', methods=['POST'])
def add_reader_with_loan():
    try:
        data = request.json
        
        # Начинаем транзакцию
        db.session.begin()
        
        # Добавляем читателя
        reader_query = '''
            INSERT INTO readers (full_name, address, phone)
            VALUES (:full_name, :address, :phone)
            RETURNING reader_id
        '''
        reader_result = db.session.execute(reader_query, {
            'full_name': data['full_name'],
            'address': data['address'],
            'phone': data['phone']
        })
        reader_id = reader_result.scalar()
        
        # Добавляем абонемент
        loan_query = '''
            INSERT INTO loans (
                library_id, book_id, reader_id,
                issue_date, due_date, return_date, deposit
            ) VALUES (
                :library_id, :book_id, :reader_id,
                :issue_date, :due_date, NULL, :deposit
            )
        '''
        db.session.execute(loan_query, {
            'library_id': data['library_id'],
            'book_id': data['book_id'],
            'reader_id': reader_id,
            'issue_date': data['issue_date'],
            'due_date': data['due_date'],
            'deposit': data['deposit']
        })
        
        db.session.commit()
        return jsonify({
            'message': 'Читатель и абонемент успешно добавлены',
            'reader_id': reader_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/report/loans-by-period', methods=['POST'])
def report_loans_by_period():
    try:
        filters = request.json
        start_date = filters.get('start_date')
        end_date = filters.get('end_date')
        library_id = filters.get('library_id')
        sort_by = filters.get('sort_by', 'issue_date')
        sort_order = filters.get('sort_order', 'desc')

        # Базовый запрос
        query = '''
            WITH loan_stats AS (
                SELECT 
                    l.library_id,
                    lib.name as library_name,
                    b.genre_id,
                    g.name as genre_name,
                    COUNT(*) as loans_count,
                    COUNT(l.return_date) as returned_count,
                    COUNT(*) - COUNT(l.return_date) as not_returned_count,
                    SUM(l.deposit) as total_deposit,
                    AVG(l.deposit) as avg_deposit
                FROM loans l
                JOIN libraries lib ON l.library_id = lib.library_id
                JOIN books b ON l.library_id = b.library_id AND l.book_id = b.book_id
                JOIN genres g ON b.genre_id = g.genre_id
                WHERE l.issue_date BETWEEN :start_date AND :end_date
            '''
        
        params = {'start_date': start_date, 'end_date': end_date}
        
        if library_id:
            query += ' AND l.library_id = :library_id'
            params['library_id'] = library_id

        query += '''
                GROUP BY l.library_id, lib.name, b.genre_id, g.name
            )
            SELECT 
                library_name,
                genre_name,
                loans_count,
                returned_count,
                not_returned_count,
                total_deposit,
                ROUND(avg_deposit::numeric, 2) as avg_deposit,
                ROUND((returned_count::float / NULLIF(loans_count, 0) * 100)::numeric, 2) as return_rate
            FROM loan_stats
            ORDER BY {} {}
        '''.format(sort_by, sort_order)

        result = db.session.execute(query, params)
        report_data = [dict(row) for row in result]

        # Добавляем итоговые данные
        totals_query = '''
            SELECT 
                COUNT(*) as total_loans,
                COUNT(return_date) as total_returned,
                COUNT(*) - COUNT(return_date) as total_not_returned,
                SUM(deposit) as total_deposit,
                ROUND(AVG(deposit)::numeric, 2) as avg_deposit,
                ROUND((COUNT(return_date)::float / COUNT(*) * 100)::numeric, 2) as total_return_rate
            FROM loans
            WHERE issue_date BETWEEN :start_date AND :end_date
        '''
        if library_id:
            totals_query += ' AND library_id = :library_id'

        totals = dict(db.session.execute(totals_query, params).fetchone())

        return jsonify({
            'data': report_data,
            'totals': totals
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/report/overdue-loans', methods=['POST'])
def report_overdue_loans():
    try:
        filters = request.json
        min_days_overdue = filters.get('min_days_overdue', 0)
        library_id = filters.get('library_id')
        sort_by = filters.get('sort_by', 'max_days_overdue')
        sort_order = filters.get('sort_order', 'desc')

        query = '''
            WITH overdue_stats AS (
                SELECT 
                    l.library_id,
                    lib.name as library_name,
                    r.reader_id,
                    r.full_name as reader_name,
                    COUNT(*) as overdue_books_count,
                    SUM(l.deposit) as total_deposit,
                    MAX(CURRENT_DATE - l.due_date) as max_days_overdue,
                    ROUND(AVG(CURRENT_DATE - l.due_date)::numeric, 1) as avg_days_overdue
                FROM loans l
                JOIN libraries lib ON l.library_id = lib.library_id
                JOIN readers r ON l.reader_id = r.reader_id
                WHERE l.return_date IS NULL 
                AND l.due_date < CURRENT_DATE
            '''

        params = {}

        if min_days_overdue > 0:
            query += ' AND (CURRENT_DATE - l.due_date) >= :min_days_overdue'
            params['min_days_overdue'] = min_days_overdue

        if library_id:
            query += ' AND l.library_id = :library_id'
            params['library_id'] = library_id

        query += '''
                GROUP BY l.library_id, lib.name, r.reader_id, r.full_name
            )
            SELECT 
                library_name,
                reader_name,
                overdue_books_count,
                total_deposit,
                max_days_overdue,
                avg_days_overdue
            FROM overdue_stats
            ORDER BY {} {}
        '''.format(
            'max_days_overdue' if sort_by == 'days_overdue' else 'overdue_books_count',
            sort_order
        )

        result = db.session.execute(query, params)
        report_data = [dict(row) for row in result]

        # Итоговые данные
        totals_query = '''
            SELECT 
                COUNT(DISTINCT reader_id) as total_readers_overdue,
                COUNT(*) as total_books_overdue,
                SUM(deposit) as total_deposit_held,
                ROUND(AVG(CURRENT_DATE - due_date)::numeric, 1) as avg_days_overdue
            FROM loans
            WHERE return_date IS NULL 
            AND due_date < CURRENT_DATE
        '''
        
        totals_params = {}
        
        if min_days_overdue > 0:
            totals_query += ' AND (CURRENT_DATE - due_date) >= :min_days_overdue'
            totals_params['min_days_overdue'] = min_days_overdue

        if library_id:
            totals_query += ' AND library_id = :library_id'
            totals_params['library_id'] = library_id

        totals = dict(db.session.execute(totals_query, totals_params).fetchone())

        return jsonify({
            'data': report_data,
            'totals': totals
        })
    except Exception as e:
        print(f"Error in overdue_loans report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/report/genre-popularity', methods=['POST'])
def report_genre_popularity():
    try:
        filters = request.json
        library_id = filters.get('library_id')
        period_months = filters.get('period_months', 12)
        sort_by = filters.get('sort_by', 'loan_count')
        sort_order = filters.get('sort_order', 'desc')

        query = '''
            WITH genre_stats AS (
                SELECT 
                    l.library_id,
                    lib.name as library_name,
                    g.genre_id,
                    g.name as genre_name,
                    COUNT(*) as loan_count,
                    COUNT(DISTINCT l.reader_id) as unique_readers,
                    ROUND(AVG(l.deposit)::numeric, 2) as avg_deposit,
                    COUNT(*) FILTER (WHERE l.return_date IS NULL) as current_loans
                FROM loans l
                JOIN libraries lib ON l.library_id = lib.library_id
                JOIN books b ON l.library_id = b.library_id AND l.book_id = b.book_id
                JOIN genres g ON b.genre_id = g.genre_id
                WHERE l.issue_date >= CURRENT_DATE - INTERVAL ':period_months months'
            '''

        params = {'period_months': period_months}

        if library_id:
            query += ' AND l.library_id = :library_id'
            params['library_id'] = library_id

        query += '''
                GROUP BY l.library_id, lib.name, g.genre_id, g.name
            )
            SELECT 
                library_name,
                genre_name,
                loan_count,
                unique_readers,
                avg_deposit,
                current_loans,
                ROUND((current_loans::float / NULLIF(loan_count, 0) * 100)::numeric, 2) as current_loan_rate,
                ROUND((unique_readers::float / loan_count * 100)::numeric, 2) as reader_diversity_rate
            FROM genre_stats
            ORDER BY {} {}
        '''.format(sort_by, sort_order)

        result = db.session.execute(query, params)
        report_data = [dict(row) for row in result]

        # Итоговые данные
        totals_query = '''
            SELECT 
                COUNT(*) as total_loans,
                COUNT(DISTINCT reader_id) as total_unique_readers,
                ROUND(AVG(deposit)::numeric, 2) as avg_deposit,
                COUNT(*) FILTER (WHERE return_date IS NULL) as total_current_loans
            FROM loans
            WHERE issue_date >= CURRENT_DATE - INTERVAL ':period_months months'
        '''
        if library_id:
            totals_query += ' AND library_id = :library_id'

        totals = dict(db.session.execute(totals_query, params).fetchone())

        return jsonify({
            'data': report_data,
            'totals': totals
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

