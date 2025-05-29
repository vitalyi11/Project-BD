from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from flask_login import LoginManager, current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from models.models import db, User
from datetime import datetime, timedelta, timezone
import os
import jwt
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import stripe
from functools import wraps
from controllers.transaction_controller import TransactionController

# Load environment variables
load_dotenv()

# Initialize app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key_for_testing')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'jwt_dev_key')
app.config['JWT_EXPIRATION_HOURS'] = 24

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
stripe_webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
client_url = os.environ.get('CLIENT_URL', 'http://localhost:5173')

# Enable CORS
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

# Initialize database
db.init_app(app)

# Setup login manager
login_manager = LoginManager()
login_manager.init_app(app)

# Setup OAuth
oauth = OAuth(app)

# Configure OAuth providers
google = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

github = oauth.register(
    name='github',
    client_id=os.environ.get('GITHUB_CLIENT_ID'),
    client_secret=os.environ.get('GITHUB_CLIENT_SECRET'),
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

with app.app_context():
    db.create_all()

# Helper function to create JWT token
def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=app.config['JWT_EXPIRATION_HOURS'])
    }
    token = jwt.encode(payload, app.config['JWT_SECRET'], algorithm='HS256')
    return token

# Registration endpoint
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Nazwa użytkownika już istnieje'}), 409
    
    # Check if email already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email już istnieje w bazie danych'}), 409
    
    # Create new user
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        password=hashed_password,
        auth_method='local'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    login_user(new_user)
    
    # Generate JWT token
    token = generate_token(new_user.id)
    
    # Create response data
    response_data = {
        'message': 'Rejestracja zakończona pomyślnie',
        'token': token,
        'user': {
            'id': new_user.id,
            'username': new_user.username,
            'email': new_user.email,
            'auth_method': 'local'
        }
    }
    
    # Create response with token in cookie
    response = jsonify(response_data)
    response.set_cookie('session_data', jwt.encode(response_data, app.config['JWT_SECRET'], algorithm='HS256'), 
                        httponly=False, secure=False, samesite='Lax', max_age=app.config['JWT_EXPIRATION_HOURS'] * 3600)
    
    return response, 201

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Nieprawidłowa nazwa użytkownika lub hasło'}), 401
    
    login_user(user)
    
    # Generate JWT token
    token = generate_token(user.id)
    
    # Create response data
    response_data = {
        'message': 'Logowanie pomyślne',
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'auth_method': user.auth_method
        }
    }
    
    # Create response with token in cookie
    response = jsonify(response_data)
    response.set_cookie('session_data', jwt.encode(response_data, app.config['JWT_SECRET'], algorithm='HS256'), 
                        httponly=False, secure=False, samesite='Lax', max_age=app.config['JWT_EXPIRATION_HOURS'] * 3600)
    
    return response, 200

# Google OAuth login
@app.route('/api/login/google')
def google_login():
    # Generate and store a nonce in the session
    session['google_auth_nonce'] = os.urandom(16).hex()
    redirect_uri = url_for('google_authorize', _external=True)
    return google.authorize_redirect(
        redirect_uri, 
        nonce=session['google_auth_nonce']
    )

@app.route('/api/login/google/callback')
def google_authorize():
    token = google.authorize_access_token()
    # Retrieve the nonce from the session
    nonce = session.pop('google_auth_nonce', None)
    user_info = google.parse_id_token(token, nonce=nonce)
    
    # Check if user already exists
    user = User.query.filter_by(email=user_info['email']).first()
    
    if not user:
        # Create new user
        user = User(
            username=user_info.get('name', user_info['email']),
            email=user_info['email'],
            password=generate_password_hash(os.urandom(24).hex()),
            auth_method='google'
        )
        db.session.add(user)
        db.session.commit()
    
    login_user(user)
    
    # Generate JWT token
    token = generate_token(user.id)
    
    # Return JSON response with token and user info
    response_data = {
        'message': 'Logowanie pomyślne',
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'auth_method': 'google'
        }
    }
    
    # Create cookie-based response
    frontend_url = "http://localhost:5173"
    
    # Set cookie with proper JSON and correctly encoded JWT
    cookie_value = jwt.encode(response_data, app.config['JWT_SECRET'], algorithm='HS256')
    max_age = app.config['JWT_EXPIRATION_HOURS'] * 3600
    
    response = redirect(f"{frontend_url}/login")
    response.set_cookie('session_data', cookie_value, 
                        httponly=False, secure=False, samesite='Lax', max_age=max_age)
    
    return response

# GitHub OAuth login
@app.route('/api/login/github')
def github_login():
    redirect_uri = url_for('github_authorize', _external=True)
    return github.authorize_redirect(redirect_uri)

@app.route('/api/login/github/callback')
def github_authorize():
    token = github.authorize_access_token()
    
    # Get user profile information
    resp = github.get('user')
    user_info = resp.json()
    
    # GitHub doesn't return email in the main user endpoint if it's private
    # So we need to explicitly request emails from the email endpoint
    email_resp = github.get('user/emails')
    emails = email_resp.json()
    
    # Find the primary or first verified email
    email = None
    if emails:
        # Try to find primary email first
        for email_obj in emails:
            if email_obj.get('primary') and email_obj.get('verified'):
                email = email_obj['email']
                break
        
        # If no primary email found, use the first verified one
        if not email:
            for email_obj in emails:
                if email_obj.get('verified'):
                    email = email_obj['email']
                    break
        
        # As last resort, use the first email
        if not email and emails:
            email = emails[0]['email']
    
    # If still no email (very unlikely), create a placeholder one
    if not email:
        email = f"github_{user_info.get('id')}@placeholder.com"
    
    # Check if user already exists with this email
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Create new user
        username = user_info.get('name') or user_info.get('login', 'GitHub User')
        
        user = User(
            username=username,
            email=email,  # Now we have a valid email
            password=generate_password_hash(os.urandom(24).hex()),
            auth_method='github'
        )
        db.session.add(user)
        db.session.commit()
    
    login_user(user)
    
    # Generate JWT token
    token = generate_token(user.id)
    
    # Create response data
    response_data = {
        'message': 'Logowanie pomyślne',
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'auth_method': 'github'
        }
    }
    
    # Create cookie-based response
    frontend_url = "http://localhost:5173"
    
    # Set cookie with proper JSON and correctly encoded JWT
    cookie_value = jwt.encode(response_data, app.config['JWT_SECRET'], algorithm='HS256')
    max_age = app.config['JWT_EXPIRATION_HOURS'] * 3600
    
    response = redirect(f"{frontend_url}/login")
    response.set_cookie('session_data', cookie_value, 
                        httponly=False, secure=False, samesite='Lax', max_age=max_age)
    
    return response

# Logout endpoint
@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    response = jsonify({'message': 'Logout successful'})
    response.delete_cookie('session_data')  # Clear the session cookie
    return response, 200

# Admin role required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'message': 'Admin privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function

# Get user info endpoint
@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'user': {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'auth_method': current_user.auth_method,
            'is_admin': current_user.is_admin
        }
    }), 200

@app.route('/api/create-offline-payment', methods=['POST'])
@login_required
def create_offline_payment():
    return TransactionController.create_offline_payment()

@app.route('/api/transactions', methods=['GET'])
@login_required
def get_user_transactions():
    return TransactionController.get_user_transactions()

@app.route('/api/admin/transactions', methods=['GET'])
@login_required
@admin_required
def get_all_transactions():
    return TransactionController.get_all_transactions()

@app.route('/api/admin/transactions/<int:transaction_id>', methods=['PUT'])
@login_required
@admin_required
def update_transaction_status(transaction_id):
    return TransactionController.update_transaction_status(transaction_id)

@app.route('/api/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    try:
        data = request.json
        line_items = data.get('lineItems', [])
        success_url = data.get('successUrl', f"{client_url}/sklep?success=true")
        cancel_url = data.get('cancelUrl', f"{client_url}/sklep?canceled=true")
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=current_user.email if current_user.email else None,
            metadata={
                'user_id': current_user.id
            }
        )
        
        return jsonify({'url': checkout_session.url})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhook', methods=['POST'])
def webhook():
    event = None
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    print("payload:", payload)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, stripe_webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        print("Invalid payload:", e)
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print("Invalid signature:", e)
        return jsonify({'error': 'Invalid signature'}), 400

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Extract metadata
        user_id = session.get('metadata', {}).get('user_id')
        payment_status = session.get('payment_status')
        amount_total = session.get('amount_total', 0) / 100  # Convert from cents to PLN
        
        # Log payment details
        print(f"Payment completed for user {user_id}")
        print(f"Payment status: {payment_status}")
        print(f"Amount: {amount_total} PLN")
        
        return jsonify({'status': 'success', 'message': 'Payment processed successfully'}), 200
    elif event['type'] == 'checkout.session.async_payment_succeeded':
        session = event['data']['object']
        print(f"Async payment succeeded for session {session.get('id')}")
        return jsonify({'status': 'success', 'message': 'Async payment succeeded'}), 200
    elif event['type'] == 'checkout.session.async_payment_failed':
        session = event['data']['object']
        print(f"Async payment failed for session {session.get('id')}")
        return jsonify({'status': 'failed', 'message': 'Async payment failed'}), 200
    elif event['type'] == 'payment_intent.created':
        payment_intent = event['data']['object']
        print(f"Payment intent created: {payment_intent.get('id')}")
        return jsonify({'status': 'success', 'message': 'Payment intent created'}), 200
    elif event['type'] == 'charge.updated':
        charge = event['data']['object']
        print(f"Charge updated: {charge.get('id')}")
        return jsonify({'status': 'success', 'message': 'Charge updated'}), 200
    else:
        print(f"Unhandled event type: {event['type']}")
    
    return jsonify({'status': 'received', 'type': event['type']}), 200

def create_admin_accout():
    admin_username = os.environ.get('ADMIN_USERNAME')
    admin_email = os.environ.get('ADMIN_EMAIL')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    if not admin_username or not admin_email or not admin_password:
        print("brak danych")
        return
    
    existing_admin = User.query.filter_by(email=admin_email).first()
    if existing_admin:
        print(f"Admin user with email {admin_email} already exists.")
        return
    
    hashed_password = generate_password_hash(admin_password)
    admin_user = User(
        username=admin_username,
        email=admin_email,
        password=hashed_password,
        auth_method='local',
        is_admin=True
    )

    db.session.add(admin_user)
    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_admin_accout()
    app.run(debug=True)
