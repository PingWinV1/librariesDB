import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Table } from 'react-bootstrap';

const ReportForm = ({ show, handleClose, reportType }) => {
    const [filters, setFilters] = useState({});
    const [libraries, setLibraries] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLibraries();
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:5000/report/${reportType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filters)
            });

            if (!response.ok) throw new Error('Failed to generate report');
            const data = await response.json();
            setReportData(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReset = () => {
        setReportData(null);
        setFilters({});
        setError(null);
    };

    const handleModalClose = () => {
        handleReset();
        handleClose();
    };

    const renderFilters = () => {
        switch (reportType) {
            case 'loans-by-period':
                return (
                    <>
                        <Form.Group className="mb-3">
                            <Form.Label>Начальная дата</Form.Label>
                            <Form.Control
                                type="date"
                                required
                                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Конечная дата</Form.Label>
                            <Form.Control
                                type="date"
                                required
                                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                            />
                        </Form.Group>
                    </>
                );

            case 'overdue-loans':
                return (
                    <Form.Group className="mb-3">
                        <Form.Label>Минимальное количество дней просрочки</Form.Label>
                        <Form.Control
                            type="number"
                            min="0"
                            defaultValue="0"
                            onChange={(e) => setFilters({...filters, min_days_overdue: parseInt(e.target.value)})}
                        />
                    </Form.Group>
                );

            case 'genre-popularity':
                return (
                    <Form.Group className="mb-3">
                        <Form.Label>Период (месяцев)</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            defaultValue="12"
                            onChange={(e) => setFilters({...filters, period_months: parseInt(e.target.value)})}
                        />
                    </Form.Group>
                );

            default:
                return null;
        }
    };

    const renderReportTable = () => {
        if (!reportData) return null;

        const { data, totals } = reportData;
        if (!data.length) return <p>Нет данных для отображения</p>;

        return (
            <div className="mt-4">
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            {Object.keys(data[0]).map(key => (
                                <th key={key}>{formatColumnName(key)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx}>
                                {Object.values(row).map((value, i) => (
                                    <td key={i}>{value}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={Object.keys(data[0]).length} className="text-end">
                                <strong>Итого:</strong>
                            </td>
                        </tr>
                        <tr>
                            {Object.entries(totals).map(([key, value]) => (
                                <td key={key}><strong>{formatColumnName(key)}: {value}</strong></td>
                            ))}
                        </tr>
                    </tfoot>
                </Table>
            </div>
        );
    };

    const formatColumnName = (key) => {
        const names = {
            library_name: 'Библиотека',
            genre_name: 'Жанр',
            total_deposit: 'Общий залог',
            avg_deposit: 'Средний залог',
            loans_count: 'Количество выдач',
            returned_count: 'Возвращено книг',
            not_returned_count: 'Не возвращено книг',
            return_rate: 'Процент возврата (%)',
            total_loans: 'Всего выдач',
            total_returned: 'Всего возвращено',
            total_not_returned: 'Всего не возвращено',
            total_return_rate: 'Общий процент возврата (%)',
            reader_name: 'Читатель',
            overdue_books_count: 'Просроченных книг',
            max_days_overdue: 'Максимальная просрочка (дней)',
            avg_days_overdue: 'Средняя просрочка (дней)',
            total_readers_overdue: 'Всего читателей с просрочкой',
            total_books_overdue: 'Всего просроченных книг',
            total_deposit_held: 'Общая сумма залога',
            loan_count: 'Количество выдач',
            unique_readers: 'Уникальных читателей',
            current_loans: 'Текущие выдачи',
            current_loan_rate: 'Процент текущих выдач (%)',
            reader_diversity_rate: 'Разнообразие читателей (%)',
            total_unique_readers: 'Всего уникальных читателей',
            total_current_loans: 'Всего текущих выдач'
        };
        return names[key] || key;
    };

    const getReportTitle = () => {
        switch (reportType) {
            case 'loans-by-period':
                return 'Отчет по выдаче книг за период';
            case 'overdue-loans':
                return 'Отчет по задолженностям читателей';
            case 'genre-popularity':
                return 'Отчет по популярности жанров';
            default:
                return 'Отчет';
        }
    };

    return (
        <Modal show={show} onHide={handleModalClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>{getReportTitle()}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <div className="alert alert-danger">{error}</div>}
                {reportData ? (
                    <>
                        {renderReportTable()}
                        <div className="mt-3 d-flex gap-2 justify-content-end">
                            <Button variant="secondary" onClick={handleReset}>
                                Новый отчёт
                            </Button>
                            <Button variant="primary" onClick={handleModalClose}>
                                Закрыть
                            </Button>
                        </div>
                    </>
                ) : (
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Библиотека</Form.Label>
                            <Form.Select
                                onChange={(e) => setFilters({...filters, library_id: e.target.value || null})}
                                value={filters.library_id || ''}
                            >
                                <option value="">Все библиотеки</option>
                                {libraries.map(lib => (
                                    <option key={lib.library_id} value={lib.library_id}>
                                        {lib.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {renderFilters()}

                        <Form.Group className="mb-3">
                            <Form.Label>Сортировать по</Form.Label>
                            <Form.Select
                                onChange={(e) => setFilters({...filters, sort_by: e.target.value})}
                                value={filters.sort_by || ''}
                            >
                                {reportType === 'loans-by-period' && (
                                    <>
                                        <option value="issue_date">Дате выдачи</option>
                                        <option value="loans_count">Количеству выдач</option>
                                        <option value="return_rate">Проценту возврата</option>
                                    </>
                                )}
                                {reportType === 'overdue-loans' && (
                                    <>
                                        <option value="days_overdue">Дням просрочки</option>
                                        <option value="overdue_books_count">Количеству книг</option>
                                    </>
                                )}
                                {reportType === 'genre-popularity' && (
                                    <>
                                        <option value="loan_count">Количеству выдач</option>
                                        <option value="unique_readers">Количеству читателей</option>
                                        <option value="current_loan_rate">Проценту текущих выдач</option>
                                    </>
                                )}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Порядок сортировки</Form.Label>
                            <Form.Select
                                onChange={(e) => setFilters({...filters, sort_order: e.target.value})}
                                value={filters.sort_order || 'desc'}
                            >
                                <option value="desc">По убыванию</option>
                                <option value="asc">По возрастанию</option>
                            </Form.Select>
                        </Form.Group>

                        <div className="d-flex gap-2 justify-content-end">
                            <Button variant="secondary" onClick={handleModalClose}>
                                Отмена
                            </Button>
                            <Button type="submit">
                                Сформировать отчет
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ReportForm; 