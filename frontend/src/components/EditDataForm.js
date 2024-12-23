import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const EditDataForm = ({ show, handleClose, data, column, value, table, rowData, onSave }) => {
    const [editedValue, setEditedValue] = useState(value);
    const [error, setError] = useState(null);

    // Проверяем, является ли поле кодом
    const isIdColumn = column?.toLowerCase().includes('_id');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (isIdColumn) {
            setError('Изменение значений в столбцах кодов запрещено!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/edit/${table}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    column: column,
                    value: editedValue,
                    rowData: rowData
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка при обновлении');
            }

            onSave();
            handleClose();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Редактировать значение</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {isIdColumn && (
                    <Alert variant="warning">
                        Внимание! Изменять значения в столбцах кодов нельзя!
                    </Alert>
                )}
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group>
                        <Form.Label>Значение</Form.Label>
                        <Form.Control
                            type="text"
                            value={editedValue}
                            onChange={(e) => setEditedValue(e.target.value)}
                            disabled={isIdColumn}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Отмена
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={isIdColumn}
                >
                    Сохранить
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EditDataForm; 