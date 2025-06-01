from flask import request, jsonify
from flask_login import current_user, login_required
from models.models import db, Transaction, TransactionItem, User
from datetime import datetime
import uuid
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'message': 'Admin privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function

class TransactionController:
    @staticmethod
    @login_required
    def create_offline_payment():
        try:
            data = request.json
            line_items = data.get('lineItems', [])
            
            transfer_title = f"PAYMENT-{uuid.uuid4().hex[:8].upper()}"
            
            total_amount = sum(item.get('price_data', {}).get('unit_amount', 0) / 100 for item in line_items)
        
            transaction = Transaction(
                user_id=current_user.id,
                amount=total_amount,
                payment_method='offline',
                status='pending',
                transfer_title=transfer_title
            )
            
            db.session.add(transaction)
            db.session.flush()  
            
            for item in line_items:
                product_data = item.get('price_data', {}).get('product_data', {})
                transaction_item = TransactionItem(
                    transaction_id=transaction.id,
                    product_name=product_data.get('name', 'Unknown Product'),
                    product_price=item.get('price_data', {}).get('unit_amount', 0) / 100,
                    quantity=item.get('quantity', 1)
                )
                db.session.add(transaction_item)
            
            db.session.commit()
            
            return jsonify({
                'message': 'Płatność offline utworzona pomyślnie',
                'transaction_id': transaction.id,
                'transfer_title': transfer_title,
                'amount': total_amount,
                'bank_details': {
                    'account_number': 'PL 12 3456 7890 1234 5678 9012 3456',
                    'bank_name': 'Example Bank',
                    'recipient': 'Gamer Shop Sp. z o.o.',
                    'transfer_title': transfer_title
                }
            }), 201
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    @login_required
    def get_user_transactions():
        try:
            transactions = Transaction.query.filter_by(user_id=current_user.id).order_by(Transaction.created_at.desc()).all()
            
            result = []
            for transaction in transactions:
                items = []
                for item in transaction.items:
                    items.append({
                        'id': item.id,
                        'product_name': item.product_name,
                        'product_price': item.product_price,
                        'quantity': item.quantity
                    })
                
                result.append({
                    'id': transaction.id,
                    'amount': transaction.amount,
                    'payment_method': transaction.payment_method,
                    'status': transaction.status,
                    'created_at': transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'transfer_title': transaction.transfer_title,
                    'items': items
                })
            
            return jsonify({'transactions': result}), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    @login_required
    @admin_required
    def get_all_transactions():
        try:
            transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()
            
            result = []
            for transaction in transactions:
                user = User.query.get(transaction.user_id)
                
                items = []
                for item in transaction.items:
                    items.append({
                        'id': item.id,
                        'product_name': item.product_name,
                        'product_price': item.product_price,
                        'quantity': item.quantity
                    })
                
                result.append({
                    'id': transaction.id,
                    'user_id': transaction.user_id,
                    'username': user.username if user else 'Unknown',
                    'email': user.email if user else 'Unknown',
                    'amount': transaction.amount,
                    'payment_method': transaction.payment_method,
                    'status': transaction.status,
                    'created_at': transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'transfer_title': transaction.transfer_title,
                    'items': items
                })
            
            return jsonify({'transactions': result}), 200
        
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @staticmethod
    @login_required
    @admin_required
    def update_transaction_status(transaction_id):
        try:
            data = request.json
            new_status = data.get('status')
            
            if new_status not in ['pending', 'approved', 'cancelled']:
                return jsonify({'error': 'Invalid status'}), 400
            
            transaction = Transaction.query.get(transaction_id)
            
            if not transaction:
                return jsonify({'error': 'Transaction not found'}), 404
            
            transaction.status = new_status
            transaction.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': f'Transaction status updated to {new_status}',
                'transaction_id': transaction.id,
                'status': transaction.status
            }), 200
        
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500