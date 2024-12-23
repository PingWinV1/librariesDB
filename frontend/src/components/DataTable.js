import React, { useState, useEffect } from 'react';
import { Table, Container, Nav, Dropdown, Modal, Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import AddDataForm from './AddDataForm';
import EditDataForm from './EditDataForm';
import ColumnFilter from './ColumnFilter';
import ReportForm from './ReportForm';

const DataTable = () => {
    const [data, setData] = useState([]);
    const [activeTable, setActiveTable] = useState('books');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState(null);
    const [sortConfig, setSortConfig] = useState([]);
    const [columnWidths, setColumnWidths] = useState({});
    const [resizing, setResizing] = useState(null);
    const [startX, setStartX] = useState(null);
    const [startWidth, setStartWidth] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteType, setDeleteType] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [showDeleteByNameConfirm, setShowDeleteByNameConfirm] = useState(false);
    const [readerNameToDelete, setReaderNameToDelete] = useState('');
    const [deleteId, setDeleteId] = useState('');
    const [showDeleteByIdConfirm, setShowDeleteByIdConfirm] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [selectedLoanLibrary, setSelectedLoanLibrary] = useState(null);
    const [selectedLoanBook, setSelectedLoanBook] = useState(null);
    const [selectedLoanReader, setSelectedLoanReader] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [books, setBooks] = useState([]);
    const [readers, setReaders] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editData, setEditData] = useState({
        column: '',
        value: '',
        rowData: null
    });
    const [columnFilters, setColumnFilters] = useState({});
    const [deleteBookId, setDeleteBookId] = useState('');
    const [deleteLibraryId, setDeleteLibraryId] = useState('');
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportType, setReportType] = useState(null);

    const tables = [
        'books', 
        'genres', 
        'libraries', 
        'loans', 
        'readers', 
        'topics',
        'available-books',
        'book-genres-count',
        'library-books-quantity',
        'readers-with-loans',
        'book-topics-detailed'
    ];

    const getDisplayName = (table) => {
        switch(table) {
            case 'available-books':
                return 'Доступные книги';
            case 'book-genres-count':
                return 'Книги по жанрам';
            case 'library-books-quantity':
                return 'Количество книг в библиотеках';
            case 'readers-with-loans':
                return 'Активные читатели';
            case 'books':
                return 'Книги';
            case 'genres':
                return 'Жанры';
            case 'libraries':
                return 'Библиотеки';
            case 'loans':
                return 'Абонементы';
            case 'readers':
                return 'Читатели';
            case 'topics':
                return 'Тематики';
            case 'book-topics-detailed':
                return 'Тематики книг';
            default:
                return table;
        }
    };

    useEffect(() => {
        fetchData(activeTable);
    }, [activeTable]);

    useEffect(() => {
        if (data.length > 0) {
            let filtered = data;

            if (searchTerm) {
                filtered = filtered.filter(row => 
                    Object.values(row).some(value => 
                        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
                    )
                );
            }

            Object.entries(columnFilters).forEach(([column, filterValue]) => {
                if (filterValue) {
                    const selectedValues = new Set(filterValue.split('|'));
                    filtered = filtered.filter(row => 
                        selectedValues.has(row[column]?.toString() || '')
                    );
                }
            });

            setFilteredData(filtered);
        }
    }, [searchTerm, data, columnFilters, activeTable]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (formType === 'book') {
            // Удаляем вызовы функций отсюда
        } else if (formType === 'loan') {
            // Удаляем вызовы функций отсюда
        }
    }, [formType]);

    const fetchData = async (table) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/${table}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field, event) => {
        const newSortConfig = [...sortConfig];
        const existingSort = newSortConfig.find(sort => sort.field === field);
        
        if (event.shiftKey) {
            // Множественная сортировка с Shift
            if (existingSort) {
                // Меняем направление существующей сортировки
                existingSort.direction = existingSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Добавляем новое поле сортировки
                newSortConfig.push({ field, direction: 'asc' });
            }
        } else {
            // Обычная сортировка без Shift
            if (existingSort && newSortConfig.length === 1) {
                // Меняем направление единственной сортировки
                existingSort.direction = existingSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // Заменяем все сортировки на новую
                newSortConfig.splice(0, newSortConfig.length, { field, direction: 'asc' });
            }
        }
        
        setSortConfig(newSortConfig);
        
        // Применяем сортировку
        const sortedData = [...data].sort((a, b) => {
            for (const sort of newSortConfig) {
                const { field, direction } = sort;
                let aVal = a[field];
                let bVal = b[field];

                // Приведение типов
                if (!isNaN(aVal) && !isNaN(bVal)) {
                    aVal = Number(aVal);
                    bVal = Number(bVal);
                } else if (field.includes('date')) {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }

                // Сравнение
                if (aVal !== bVal) {
                    return direction === 'asc' 
                        ? (aVal < bVal ? -1 : 1)
                        : (aVal > bVal ? -1 : 1);
                }
            }
            return 0;
        });

        setData(sortedData);
    };

    const handleResizeStart = (e, key) => {
        setResizing(key);
        setStartX(e.pageX);
        setStartWidth(columnWidths[key] || 150); // Дефолтная ширина 150px
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e) => {
        if (!resizing || !startX) return;
        
        const diff = e.pageX - startX;
        const newWidth = Math.max(100, startWidth + diff); // Минимальная ширина 100px
        
        setColumnWidths(prev => ({
            ...prev,
            [resizing]: newWidth
        }));
    };

    const handleResizeEnd = () => {
        setResizing(null);
        setStartX(null);
        setStartWidth(null);
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const getOrderedColumns = (data) => {
        if (!data.length) return Object.keys(data[0]);
        
        if (activeTable === 'books') {
            return [
                'title',          
                'author',         
                'book_id',        
                'genre_id',
                'library_id',
                'publication_place',
                'publication_year',
                'publisher',
                'quantity'
            ];
        }
        
        if (activeTable === 'libraries') {
            return [
                'library_id',    
                'name',          
                'address'        
            ];
        }

        if (activeTable === 'loans') {
            return [
                'library_id',
                'library_name',
                'book_id',
                'book_title',
                'reader_id',
                'reader_name',
                'issue_date',
                'due_date',
                'return_date',
                'deposit'
            ];
        }

        if (activeTable === 'readers') {
            return [
                'reader_id',
                'full_name',
                'phone',
                'address'
            ];
        }

        if (activeTable === 'available-books') {
            return [
                'book_title',
                'book_author',
                'library_name',
                'available_quantity',
                'total_quantity'
            ];
        }
        
        if (activeTable === 'book-topics-detailed') {
            return [
                'book_title',
                'book_author',
                'topic_names'
            ];
        }
        
        if (activeTable === 'readers-with-loans') {
            return [
                'reader_name',
                'current_loans_count',
                'reader_phone',
                'library_id',
                'reader_address',
                'borrowed_books'
            ];
        }
        
        return Object.keys(data[0]);
    };

    const getColumnDisplayName = (column) => {
        switch(column) {
            // Идентификаторы
            case 'library_id':
                return 'Код библиотеки';
            case 'book_id':
                return 'Код книги';
            case 'reader_id':
                return 'Код читателя';
            case 'genre_id':
                return 'Код жанра';
            case 'topic_id':
                return 'Код тематики';
            
            // Названия и имена
            case 'name':
                return 'Название';
            case 'library_name':
                return 'Библиотека';
            case 'book_title':
                return 'Название книги';
            case 'reader_name':
                return 'ФИО читателя';
            case 'full_name':
                return 'ФИО';
            case 'genre_name':
                return 'Жанр';
            case 'topic_names':
                return 'Тематики';
            
            // Книги
            case 'title':
                return 'Название';
            case 'author':
                return 'Автор';
            case 'book_author':
                return 'Автор';
            case 'publisher':
                return 'Издательство';
            case 'publication_place':
                return 'Место издания';
            case 'publication_year':
                return 'Год издания';
            case 'quantity':
                return 'Количество';
            
            // Абонементы
            case 'issue_date':
                return 'Дата выдачи';
            case 'due_date':
                return 'Срок возврата';
            case 'return_date':
                return 'Дата возврата';
            case 'deposit':
                return 'Залог';
            
            // Статистика
            case 'book_count':
                return 'Количество книг';
            case 'total_books':
                return 'Всего книг';
            case 'available_quantity':
                return 'Доступно';
            case 'total_quantity':
                return 'Всего';
            case 'current_loans_count':
                return 'Активных абонементов';
            case 'borrowed_books':
                return 'Взятые книги';
            
            // Контактная информация
            case 'address':
                return 'Адрес';
            case 'phone':
                return 'Телефон';
            case 'reader_phone':
                return 'Телефон';
            case 'reader_address':
                return 'Адрес';
            
            default:
                return column;
        }
    };

    const renderTableHeaders = () => {
        if (data.length === 0) return null;
        const columns = getOrderedColumns(data);
        return (
            <thead>
                <tr>
                    {columns.map((key) => (
                        <th 
                            key={key} 
                            style={{ 
                                cursor: resizing ? 'col-resize' : 'pointer',
                                position: 'relative',
                                width: columnWidths[key] || 'auto',
                                minWidth: '100px'
                            }}
                            className={`position-relative ${columnFilters[key] ? 'filter-active' : ''}`}
                        >
                            <div 
                                onClick={(e) => {
                                    if (!e.target.closest('.column-filter')) {
                                        handleSort(key, e);
                                    }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <span>{getColumnDisplayName(key)}</span>
                                {sortConfig.map((sort, index) => {
                                    if (sort.field === key) {
                                        return (
                                            <span key={index} className="ms-2">
                                                {sort.direction === 'asc' ? '↑' : '↓'}
                                                {sortConfig.length > 1 && 
                                                    <sub>{index + 1}</sub>
                                                }
                                            </span>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                            <ColumnFilter
                                column={key}
                                value={columnFilters[key]}
                                onChange={(value) => handleFilterChange(key, value)}
                                onClear={() => clearFilter(key)}
                                data={data}
                            />
                            <div
                                className="resize-handle"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleResizeStart(e, key);
                                }}
                            />
                        </th>
                    ))}
                </tr>
            </thead>
        );
    };

    const renderTableBody = () => {
        return (
            <tbody>
                {filteredData.map((row, index) => (
                    <tr key={index}>
                        {getOrderedColumns(data).map((key) => (
                            <td 
                                key={key} 
                                onClick={() => handleCellClick(key, row[key], row)}
                                style={{ cursor: editMode ? 'pointer' : 'default' }}
                            >
                                {row[key]?.toString()}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        );
    };

    const handleAddData = (type) => {
        setFormType(type);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setFormType(null);
    };

    const handleDelete = async () => {
        try {
            let response;
            
            if (deleteType === 'book') {
                if (!deleteBookId || !deleteLibraryId) {
                    setError('Необходимо указать оба кода');
                    return;
                }
                response = await fetch(
                    `http://localhost:5000/delete/book/${deleteLibraryId}/${deleteBookId}`,
                    { method: 'DELETE' }
                );
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Не удалось удалить книгу');
                }
            } else {
                if (deleteType === 'loan') {
                    const response = await fetch(`http://localhost:5000/delete/loan`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            library_id: selectedLoanLibrary,
                            book_id: selectedLoanBook,
                            reader_id: selectedLoanReader
                        })
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Не удалось удалить абонемент');
                    }
                } else {
                    response = await fetch(`http://localhost:5000/delete/${deleteType}/${deleteId}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Не удалось удалить');
                    }
                }
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
            
            fetchData(activeTable);
            setShowDeleteByIdConfirm(false);
            setDeleteId('');
            setDeleteBookId('');
            setDeleteLibraryId('');
            setSelectedLoanLibrary(null);
            setSelectedLoanBook(null);
            setSelectedLoanReader(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteClick = (type) => {
        setDeleteType(type);
        if (type === 'loan') {
            fetchLibraries();
            fetchBooks();
            fetchReaders();
        }
        setShowDeleteByIdConfirm(true);
    };

    const handleDeleteByName = async () => {
        try {
            const response = await fetch(
                `http://localhost:5000/delete/reader/by-name/${encodeURIComponent(readerNameToDelete)}`,
                { method: 'DELETE' }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
            
            fetchData(activeTable);
            setShowDeleteByNameConfirm(false);
            setReaderNameToDelete('');
        } catch (err) {
            setError(err.message);
        }
    };

    const tableStyles = {
        th: {
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            backgroundColor: '#f8f9fa',
            transition: 'background-color 0.2s'
        },
        'th:hover': {
            backgroundColor: '#e9ecef'
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

    const handleCellClick = (column, value, rowData) => {
        if (editMode) {
            setEditData({
                column,
                value,
                rowData
            });
            setShowEditForm(true);
        }
    };

    const handleFilterChange = (column, value) => {
        setColumnFilters(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const clearFilter = (column) => {
        setColumnFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[column];
            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setColumnFilters({});
    };

    return (
        <Container fluid className="mt-4 px-2 px-sm-3 px-md-4">
            <div className="d-flex flex-column gap-3">
                <Nav variant="tabs" className="flex-nowrap">
                    {tables.map((table) => (
                        <Nav.Item key={table}>
                            <Nav.Link 
                                active={activeTable === table}
                                onClick={() => setActiveTable(table)}
                                className="px-2 px-sm-3"
                            >
                                {getDisplayName(table)}
                            </Nav.Link>
                        </Nav.Item>
                    ))}
                </Nav>

                <div className="control-panel d-flex gap-2">
                    <Form.Control
                        type="text"
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-box me-2"
                        style={{ width: isMobile ? '100%' : '200px' }}
                    />
                    {Object.keys(columnFilters).length > 0 && (
                        <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={clearAllFilters}
                            className="me-2"
                        >
                            Очистить фильтры
                        </Button>
                    )}
                    <div className="button-group d-flex gap-2">
                        <Dropdown className="flex-fill">
                            <Dropdown.Toggle variant="success" id="dropdown-add" className="w-100">
                                {isMobile ? '+' : 'Добавить'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu align={isMobile ? 'end' : 'start'}>
                                <Dropdown.Item onClick={() => handleAddData('book')}>Добавить книгу</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('reader')}>Добавить читателя</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('reader-with-loan')}>Добавить читателя с абонементом</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('library')}>Добавить библиотеку</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('topic')}>Добавить тематику</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('loan')}>Добавить абонемент</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('book-topic')}>Присвоить тематику книге</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

                        <Button 
                            variant={editMode ? "warning" : "primary"}
                            onClick={() => setEditMode(!editMode)}
                            className="flex-fill"
                        >
                            {editMode ? 'Отменить редактирование' : 'Редактировать'}
                        </Button>

                        <Dropdown className="flex-fill">
                            <Dropdown.Toggle variant="danger" id="dropdown-delete" className="w-100">
                                {isMobile ? '−' : 'Удалить'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu align={isMobile ? 'end' : 'start'}>
                                <Dropdown.Item onClick={() => handleDeleteClick('book')}>Удалить книгу</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleDeleteClick('reader')}>Удалить читателя по коду</Dropdown.Item>
                                <Dropdown.Item onClick={() => setShowDeleteByNameConfirm(true)}>Удалить читателя по имени</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleDeleteClick('library')}>Удалить библиотеку</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleDeleteClick('genre')}>Удалить жанр</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleDeleteClick('topic')}>Удалить тематику</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleDeleteClick('loan')}>Удалить абонемент</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleAddData('delete-book-topic')}>Убрать тематику у книги</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>

                        <Dropdown className="flex-fill">
                            <Dropdown.Toggle variant="info" id="dropdown-reports" className="w-100">
                                {isMobile ? 'О' : 'Отчеты'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu align={isMobile ? 'end' : 'start'}>
                                <Dropdown.Item onClick={() => {
                                    setReportType('loans-by-period');
                                    setShowReportForm(true);
                                }}>Отчет по выдаче книг</Dropdown.Item>
                                <Dropdown.Item onClick={() => {
                                    setReportType('overdue-loans');
                                    setShowReportForm(true);
                                }}>Отчет по задолженностям</Dropdown.Item>
                                <Dropdown.Item onClick={() => {
                                    setReportType('genre-popularity');
                                    setShowReportForm(true);
                                }}>Отчет по популярности жанров</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </div>

                {loading && <p>агрузка...</p>}
                {error && <p className="text-danger">Ошибка: {error}</p>}
                {!loading && !error && (
                    <>
                        <div className="mb-2">
                            {searchTerm && (
                                <small className="text-muted">
                                    Найдено результатов: {filteredData.length}
                                </small>
                            )}
                        </div>
                        <div className="table-container">
                            <Table striped bordered hover size={isMobile ? "sm" : "md"}>
                                {renderTableHeaders()}
                                {renderTableBody()}
                            </Table>
                        </div>
                    </>
                )}

                <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Подтверждение удаления</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Вы уверены, что хотите удалить этот элемент?
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                            Отмена
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            Удалить
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showDeleteByNameConfirm} onHide={() => setShowDeleteByNameConfirm(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Удаление читателя по имени</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Введите полное имя читателя</Form.Label>
                            <Form.Control
                                type="text"
                                value={readerNameToDelete}
                                onChange={(e) => setReaderNameToDelete(e.target.value)}
                                placeholder="Введите полное имя..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteByNameConfirm(false)}>
                            Отмена
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={handleDeleteByName}
                            disabled={!readerNameToDelete.trim()}
                        >
                            Удалить
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showDeleteByIdConfirm} onHide={() => setShowDeleteByIdConfirm(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {deleteType === 'loan' ? 'Удаление абонемента' : 
                             deleteType === 'book' ? 'Удаление книги' : 'Удаление по коду'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {deleteType === 'loan' ? (
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Библиотека</Form.Label>
                                    <Form.Select 
                                        onChange={(e) => setSelectedLoanLibrary(e.target.value)}
                                        value={selectedLoanLibrary || ''}
                                    >
                                        <option value="">Выберите библиотеку</option>
                                        {libraries.map(lib => (
                                            <option key={lib.library_id} value={lib.library_id}>
                                                {lib.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Книга</Form.Label>
                                    <Form.Select 
                                        onChange={(e) => setSelectedLoanBook(e.target.value)}
                                        value={selectedLoanBook || ''}
                                        disabled={!selectedLoanLibrary}
                                    >
                                        <option value="">Выберите книгу</option>
                                        {books.filter(book => book.library_id === parseInt(selectedLoanLibrary)).map(book => (
                                            <option key={book.book_id} value={book.book_id}>
                                                {book.title}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Читатель</Form.Label>
                                    <Form.Select 
                                        onChange={(e) => setSelectedLoanReader(e.target.value)}
                                        value={selectedLoanReader || ''}
                                        disabled={!selectedLoanBook}
                                    >
                                        <option value="">Выберите читателя</option>
                                        {readers.map(reader => (
                                            <option key={reader.reader_id} value={reader.reader_id}>
                                                {reader.full_name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Form>
                        ) : deleteType === 'book' ? (
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Код библиотеки</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={deleteLibraryId}
                                        onChange={(e) => setDeleteLibraryId(e.target.value)}
                                        placeholder="Введите код библиотеки..."
                                    />
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label>Код книги</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={deleteBookId}
                                        onChange={(e) => setDeleteBookId(e.target.value)}
                                        placeholder="Введите код ниги..."
                                    />
                                </Form.Group>
                            </Form>
                        ) : (
                            <Form.Group>
                                <Form.Label>Введите код</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={deleteId}
                                    onChange={(e) => setDeleteId(e.target.value)}
                                    placeholder="Введите код..."
                                />
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeleteByIdConfirm(false)}>
                            Отмена
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={handleDelete}
                            disabled={deleteType === 'loan' 
                                ? (!selectedLoanLibrary || !selectedLoanBook || !selectedLoanReader)
                                : deleteType === 'book'
                                ? (!deleteLibraryId || !deleteBookId)
                                : !deleteId.trim()}
                        >
                            Удалить
                        </Button>
                    </Modal.Footer>
                </Modal>

                <AddDataForm 
                    show={showForm} 
                    handleClose={() => {
                        handleCloseForm();
                        fetchData(activeTable);
                    }}
                    formType={formType}
                />

                <EditDataForm 
                    show={showEditForm}
                    handleClose={() => setShowEditForm(false)}
                    data={data}
                    column={editData.column}
                    value={editData.value}
                    table={activeTable}
                    rowData={editData.rowData}
                    onSave={() => {
                        fetchData(activeTable);
                        setEditMode(false);
                    }}
                />

                <ReportForm 
                    show={showReportForm}
                    handleClose={() => setShowReportForm(false)}
                    reportType={reportType}
                />
            </div>
        </Container>
    );
};

export default DataTable; 