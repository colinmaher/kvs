import requests
res = requests.put('http://localhost:8080/keyValue-store/subject', data = {'val': 'Distributed System'})


res = requests.put('http://localhost:8080/keyValue-store/subject', data = {'val': 'bar123'})

res = requests.get('http://localhost:8080/keyValue-store/subject')
