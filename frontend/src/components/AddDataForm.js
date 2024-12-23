import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

const AddDataForm = ({ show, handleClose, formType }) => {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);
    const [genres, setGenres] = useState([]);
    const [topics, setTopics] = useState([]);
    const [libraries, setLibraries] = useState([]);
    const [books, setBooks] = useState([]);
    const [readers, setReaders] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [selectedLibrary, setSelectedLibrary] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [availableQuantity, setAvailableQuantity] = useState(null);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [authors, setAuthors] = useState([]);
    const [filteredBooksByAuthor, setFilteredBooksByAuthor] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [topicFields, setTopicFields] = useState([{ id: 0 }]);
    const [bookTopics, setBookTopics] = useState([]);
    const [showGenreForm, setShowGenreForm] = useState(false);
    const [newGenre, setNewGenre] = useState('');
    const [booksWithTopics, setBooksWithTopics] = useState([]);

    useEffect(() => {
        if (formType === 'book') {
            fetchGenres();
            fetchLibraries();
        } else if (formType === 'loan' || formType === 'reader-with-loan') {
            fetchLibraries();
            fetchBooks();
            fetchReaders();
        } else if (formType === 'book-topic') {
            fetchLibraries();
            fetchBooks();
            fetchTopics();
        } else if (formType === 'delete-book-topic') {
            fetchLibraries();
            fetchBooksWithTopics();
        }
    }, [formType]);

    useEffect(() => {
        if (books.length > 0) {
            setAuthors(getUniqueAuthors(books));
        }
    }, [books]);

    const fetchGenres = async () => {
        try {
            const response = await fetch('http://localhost:5000/genres');
            if (!response.ok) throw new Error('Failed to fetch genres');
            const data = await response.json();
            setGenres(data);
        } catch (err) {
            setError('Failed to load genres');
        }
    };

    const fetchTopics = async () => {
        try {
            const response = await fetch('http://localhost:5000/topics');
            if (!response.ok) throw new Error('Failed to fetch topics');
            const data = await response.json();
            setTopics(data);
        } catch (err) {
            setError('Failed to load topics');
        }
    };

    const fetchLibraries = async () => {
        try {
            const response = await fetch('http://localhost:5000/libraries');
            if (!response.ok) throw new Error('Failed to fetch libraries');
            const data = await response.json();
            setLibraries(data);
        } catch (err) {
            setError('Failed to load libraries');
        }
    };

    const fetchBooks = async () => {
        try {
            const response = await fetch('http://localhost:5000/books');
            if (!response.ok) throw new Error('Failed to fetch books');
            const data = await response.json();
            setBooks(data);
        } catch (err) {
            setError('Failed to load books');
        }
    };

    const fetchReaders = async () => {
        try {
            const response = await fetch('http://localhost:5000/readers');
            if (!response.ok) throw new Error('Failed to fetch readers');
            const data = await response.json();
            setReaders(data);
        } catch (err) {
            setError('Failed to load readers');
        }
    };

    const fetchBooksWithTopics = async () => {
        try {
            const response = await fetch('http://localhost:5000/books-with-topics');
            if (!response.ok) throw new Error('Failed to fetch books with topics');
            const data = await response.json();
            setBooksWithTopics(data);
        } catch (err) {
            setError('Failed to load books with topics');
        }
    };

    const fetchBookTopics = async (libraryId, bookId) => {
        try {
            const response = await fetch(`http://localhost:5000/book-topics/${libraryId}/${bookId}`);
            if (!response.ok) throw new Error('Failed to fetch book topics');
            const data = await response.json();
            setTopics(data);
        } catch (err) {
            setError('Failed to load book topics');
        }
    };

    const filterBooksByLibrary = (libraryId) => {
        if (!libraryId) {
            setFilteredBooks([]);
            return;
        }
        const filtered = books.filter(book => book.library_id === parseInt(libraryId));
        setFilteredBooks(filtered);
    };

    const getAvailableQuantity = async (bookId, libraryId) => {
        try {
            const response = await fetch('http://localhost:5000/available-books');
            if (!response.ok) throw new Error('Failed to fetch available books');
            const data = await response.json();
            
            const availableBook = data.find(book => 
                book.book_title === filteredBooks.find(b => b.book_id === parseInt(bookId))?.title &&
                book.library_name === libraries.find(l => l.library_id === parseInt(libraryId))?.name
            );
            
            if (availableBook) {
                setAvailableQuantity(availableBook.available_quantity);
            } else {
                setAvailableQuantity(0);
            }
        } catch (err) {
            setError('Failed to load available quantity');
            setAvailableQuantity(0);
        }
    };

    const getUniqueAuthors = (books) => {
        const uniqueAuthors = [...new Set(books.map(book => book.author))];
        return uniqueAuthors
            .sort((a, b) => a.localeCompare(b, 'ru'))
            .map(author => ({ author }));
    };

    const filterBooksByAuthor = (author) => {
        if (!author) {
            setFilteredBooksByAuthor([]);
            return;
        }
        const filtered = books.filter(book => book.author === author);
        setFilteredBooksByAuthor(filtered);
    };

    const addTopicField = () => {
        setTopicFields([...topicFields, { id: topicFields.length }]);
    };

    const formConfigs = {
        book: {
            title: 'Добавить книгу',
            fields: [
                { name: 'title', label: 'Название', type: 'text', required: true },
                { name: 'author', label: 'Автор', type: 'text', required: true },
                { name: 'genre_id', label: 'Жанр', type: 'select', required: true,
                  options: genres, optionValue: 'genre_id', optionLabel: 'name' },
                { name: 'library_id', label: 'Библиотека', type: 'select', required: true,
                  options: libraries, optionValue: 'library_id', optionLabel: 'name' },
                { name: 'publication_place', label: 'Место издания', type: 'text', required: true },
                { name: 'publication_year', label: 'Год издания', type: 'number', required: true },
                { name: 'publisher', label: 'Издательство', type: 'text', required: true },
                { name: 'quantity', label: 'Количество', type: 'number', required: true }
            ],
            endpoint: '/add/book'
        },
        reader: {
            title: 'Добавить читателя',
            fields: [
                { name: 'full_name', label: 'ФИО', type: 'text', required: true },
                { name: 'phone', label: 'Телефон', type: 'text', required: true },
                { name: 'address', label: 'Адрес', type: 'text', required: true }
            ],
            endpoint: '/add/reader'
        },
        library: {
            title: 'Добавить библиотеку',
            fields: [
                { name: 'name', label: 'Название', type: 'text', required: true },
                { name: 'address', label: 'Адрес', type: 'text', required: true }
            ],
            endpoint: '/add/library'
        },
        loan: {
            title: 'Добавить абонемент',
            fields: [
                { 
                    name: 'library_id', 
                    label: 'Библиотека', 
                    type: 'select', 
                    required: true,
                    options: libraries, 
                    optionValue: 'library_id', 
                    optionLabel: 'name'
                },
                { 
                    name: 'book_id', 
                    label: 'Книга', 
                    type: 'select', 
                    required: true,
                    options: selectedLibrary ? filteredBooks : [],
                    optionValue: 'book_id', 
                    optionLabel: 'title',
                    disabled: !selectedLibrary
                },
                { 
                    name: 'reader_id', 
                    label: 'Читатель', 
                    type: 'select', 
                    required: true,
                    options: readers,
                    optionValue: 'reader_id', 
                    optionLabel: 'full_name'
                },
                { name: 'issue_date', label: 'Дата выдачи', type: 'date', required: true },
                { name: 'due_date', label: 'Срок возврата', type: 'date', required: true },
                { name: 'deposit', label: 'Залог', type: 'number', required: true }
            ],
            endpoint: '/add/loan'
        },
        'book-topic': {
            title: 'Присвоить тематику книге',
            fields: [
                { 
                    name: 'library_id', 
                    label: 'Библиотека', 
                    type: 'select', 
                    required: true,
                    options: libraries, 
                    optionValue: 'library_id', 
                    optionLabel: 'name'
                },
                { 
                    name: 'book_id', 
                    label: 'Книга', 
                    type: 'select', 
                    required: true,
                    options: selectedLibrary ? filteredBooks : [],
                    optionValue: 'book_id', 
                    optionLabel: 'title',
                    disabled: !selectedLibrary
                },
                { 
                    name: 'topic_id', 
                    label: 'Тематика', 
                    type: 'select', 
                    required: true,
                    options: topics,
                    optionValue: 'topic_id', 
                    optionLabel: 'name'
                }
            ],
            endpoint: '/add/book-topic'
        },
        'delete-book-topic': {
            title: 'Удалить тематику у книги',
            fields: [
                { 
                    name: 'library_id', 
                    label: 'Библиотека', 
                    type: 'select', 
                    required: true,
                    options: libraries.filter(lib => 
                        booksWithTopics.some(book => book.library_id === lib.library_id)
                    ),
                    optionValue: 'library_id', 
                    optionLabel: 'name'
                },
                { 
                    name: 'book_id', 
                    label: 'Книга', 
                    type: 'select', 
                    required: true,
                    options: selectedLibrary ? 
                        booksWithTopics.filter(book => book.library_id === parseInt(selectedLibrary)) : [],
                    optionValue: 'book_id', 
                    optionLabel: 'title',
                    disabled: !selectedLibrary
                },
                { 
                    name: 'topic_id', 
                    label: 'Тематика для удаления', 
                    type: 'select', 
                    required: true,
                    options: topics,
                    optionValue: 'topic_id', 
                    optionLabel: 'name',
                    disabled: !selectedLibrary || !formData.book_id
                }
            ],
            endpoint: '/delete/book-topic'
        },
        'reader-with-loan': {
            title: 'Добавить читателя с абонементом',
            fields: [
                // Поля читателя
                { name: 'full_name', label: 'ФИО', type: 'text', required: true },
                { name: 'phone', label: 'Телефон', type: 'text', required: true },
                { name: 'address', label: 'Адрес', type: 'text', required: true },
                
                // Поля абонемента
                { 
                    name: 'library_id', 
                    label: 'Библиотека', 
                    type: 'select', 
                    required: true,
                    options: libraries, 
                    optionValue: 'library_id', 
                    optionLabel: 'name'
                },
                { 
                    name: 'book_id', 
                    label: 'Книга', 
                    type: 'select', 
                    required: true,
                    options: selectedLibrary ? filteredBooks : [],
                    optionValue: 'book_id', 
                    optionLabel: 'title',
                    disabled: !selectedLibrary
                },
                { name: 'issue_date', label: 'Дата выдачи', type: 'date', required: true },
                { name: 'due_date', label: 'Срок возврата', type: 'date', required: true },
                { name: 'deposit', label: 'Залог', type: 'number', required: true }
            ],
            endpoint: '/add/reader-with-loan'
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        try {
            const config = formConfigs[formType];
            const method = formType === 'delete-book-topic' ? 'DELETE' : 'POST';
            
            // Проверяем наличие обязательных полей
            const requiredFields = config.fields
                .filter(field => field.required)
                .map(field => field.name);

            const missingFields = requiredFields.filter(field => !formData[field]);
            
            if (missingFields.length > 0) {
                setError(`Пожалуйста, заполните все обязательные поля: ${missingFields.join(', ')}`);
                return;
            }

            const response = await fetch(`http://localhost:5000${config.endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при выполнении операции');
            }

            handleClose();
            window.location.reload();
        } catch (err) {
            setError(err.message || 'Произошла ошибка');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'library_id') {
            setSelectedLibrary(value);
            if (formType === 'delete-book-topic') {
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    book_id: '',
                    topic_id: ''
                }));
                setTopics([]);
            } else {
                filterBooksByLibrary(value);
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    book_id: ''
                }));
                setAvailableQuantity(null);
                setSelectedBook(null);
            }
        } else if (name === 'book_id') {
            if (formType === 'delete-book-topic') {
                fetchBookTopics(formData.library_id, value);
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    topic_id: ''
                }));
            } else {
                setSelectedBook(value);
                if (formType === 'loan' || formType === 'reader-with-loan') {
                    getAvailableQuantity(value, selectedLibrary);
                }
                setFormData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleAddGenre = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/add/genre', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newGenre })
            });

            if (!response.ok) {
                throw new Error('Ошибка при добавлении жанра');
            }

            await fetchGenres();
            setShowGenreForm(false);
            setNewGenre('');
        } catch (err) {
            setError(err.message);
        }
    };

    const renderField = (field) => {
        if (field.type === 'select') {
            if (field.name === 'genre_id') {
                return (
                    <div>
                        <div className="d-flex gap-2">
                            <Form.Select
                                name={field.name}
                                required={field.required}
                                onChange={handleChange}
                                disabled={field.disabled}
                                className="flex-grow-1"
                            >
                                <option value="">Выберите {field.label}</option>
                                {field.options.map(option => (
                                    <option 
                                        key={option[field.optionValue]} 
                                        value={option[field.optionValue]}
                                    >
                                        {option[field.optionLabel]}
                                    </option>
                                ))}
                            </Form.Select>
                            <Button 
                                variant="outline-secondary"
                                onClick={() => setShowGenreForm(true)}
                                type="button"
                            >
                                +
                            </Button>
                        </div>

                        <Modal show={showGenreForm} onHide={() => setShowGenreForm(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Добавить новый жанр</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Form onSubmit={handleAddGenre}>
                                    <Form.Group>
                                        <Form.Label>Название жанра</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={newGenre}
                                            onChange={(e) => setNewGenre(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                    <div className="mt-3">
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => setShowGenreForm(false)}
                                            className="me-2"
                                            type="button"
                                        >
                                            Отмена
                                        </Button>
                                        <Button 
                                            variant="primary" 
                                            type="submit"
                                            disabled={!newGenre.trim()}
                                        >
                                            Добавить
                                        </Button>
                                    </div>
                                </Form>
                            </Modal.Body>
                        </Modal>
                    </div>
                );
            }
            return (
                <>
                    <Form.Select
                        name={field.name}
                        required={field.required}
                        onChange={handleChange}
                        disabled={field.disabled}
                    >
                        <option value="">Выберите {field.label}</option>
                        {field.options.map(option => (
                            <option 
                                key={option[field.optionValue]} 
                                value={option[field.optionValue]}
                            >
                                {option[field.optionLabel]}
                            </option>
                        ))}
                    </Form.Select>
                    {field.name === 'book_id' && selectedBook && availableQuantity !== null && (
                        <Form.Text className={availableQuantity === 0 ? "text-danger" : "text-muted"}>
                            Доступно экземпляров: {availableQuantity}
                            {availableQuantity === 0 && " (выдача невозможна)"}
                        </Form.Text>
                    )}
                </>
            );
        }

        if (field.type === 'number') {
            return (
                <Form.Control
                    type="number"
                    name={field.name}
                    required={field.required}
                    onChange={handleChange}
                    min="0"
                />
            );
        }

        if (field.type === 'multiselect') {
            return (
                <Form.Select
                    name={field.name}
                    required={field.required}
                    onChange={handleChange}
                    disabled={field.disabled}
                    multiple
                    size={5}
                >
                    {field.options.map(option => (
                        <option 
                            key={option[field.optionValue]} 
                            value={option[field.optionValue]}
                        >
                            {option[field.optionLabel]}
                        </option>
                    ))}
                </Form.Select>
            );
        }

        if (field.type === 'topic_fields') {
            return (
                <div>
                    {topicFields.map((topicField, index) => (
                        <div key={topicField.id} className="d-flex align-items-center mb-2">
                            <Form.Select
                                name={`topic_id_${index}`}
                                required={index === 0}
                                onChange={handleChange}
                                className="me-2"
                                value={formData.topic_ids?.[index] || ''}
                            >
                                <option value="">Выберите тематику</option>
                                {topics
                                    .filter(topic => !formData.topic_ids?.includes(topic.topic_id.toString()) || 
                                                   formData.topic_ids[index] === topic.topic_id.toString())
                                    .map(topic => (
                                        <option 
                                            key={topic.topic_id} 
                                            value={topic.topic_id}
                                        >
                                            {topic.name}
                                        </option>
                                    ))}
                            </Form.Select>
                            {index === topicFields.length - 1 && (
                                <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    onClick={addTopicField}
                                    disabled={!formData.topic_ids?.[index]}
                                >
                                    +
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (field.type === 'topic_fields_delete') {
            return (
                <div>
                    {topicFields.map((topicField, index) => (
                        <div key={topicField.id} className="d-flex align-items-center mb-2">
                            <Form.Select
                                name={`topic_id_${index}`}
                                required={index === 0}
                                onChange={handleChange}
                                className="me-2"
                                value={formData.topic_ids?.[index] || ''}
                            >
                                <option value="">Выберите тематику для удаления</option>
                                {bookTopics
                                    .filter(topic => !formData.topic_ids?.includes(topic.topic_id.toString()) || 
                                                   formData.topic_ids[index] === topic.topic_id.toString())
                                    .map(topic => (
                                        <option 
                                            key={topic.topic_id} 
                                            value={topic.topic_id}
                                        >
                                            {topic.name}
                                        </option>
                                    ))}
                            </Form.Select>
                            {index === topicFields.length - 1 && bookTopics.length > 0 && (
                                <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={addTopicField}
                                    disabled={!formData.topic_ids?.[index]}
                                >
                                    +
                                </Button>
                            )}
                        </div>
                    ))}
                    {bookTopics.length === 0 && formData.book_title && (
                        <div className="text-muted"> этой книги нет тематик</div>
                    )}
                </div>
            );
        }

        return (
            <Form.Control
                type={field.type}
                name={field.name}
                required={field.required}
                onChange={handleChange}
            />
        );
    };

    const config = formConfigs[formType];

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{config?.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <div className="alert alert-danger">{error}</div>}
                <Form onSubmit={handleSubmit}>
                    {config?.fields.map((field) => (
                        <Form.Group key={field.name} className="mb-3">
                            <Form.Label>{field.label}</Form.Label>
                            {renderField(field)}
                        </Form.Group>
                    ))}
                    <Button 
                        variant={formType === 'delete-book-topic' ? 'danger' : 'primary'}
                        type="submit"
                        disabled={formType === 'loan' && availableQuantity === 0}
                    >
                        {formType === 'delete-book-topic' 
                            ? 'Удалить' 
                            : (availableQuantity === 0 ? 'Нет доступных экземпляров' : 'Добавить')}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default AddDataForm; 