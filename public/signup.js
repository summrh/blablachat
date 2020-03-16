function signup() {
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;

    if (!/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$/.test(email) || !name) {
        alert('Please, enter valid email and fill the name field');
        return;
    }

    fetch('/users', {
        method: 'post',
        headers: { 'Content-type': 'application/json;charset=UTF-8' },
        body: JSON.stringify({ email, name }),
    })
        .then(res => {
            if (res.status !== 200) {
                res.json().then(data => {
                    alert(data.error || `Error ${res.status}: ${res.statusText}`);
                });
                return;
            }

            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('token');

            console.log('Signup succeeded, redirecting...');
            window.location.replace('/');
        })
        .catch(alert);
}

function signupOnEnter(event) {
    if (event.key === 'Enter') {
        signup();
    }
}
