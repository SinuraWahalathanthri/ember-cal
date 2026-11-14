.PHONY: dev build test api reproduce
dev:
	npm run dev
api:
	python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
build:
	npm run build
test:
	npm test
	python -m unittest discover -s pipeline -p 'test_*.py'
reproduce:
	python -m pipeline.demo --region $(or $(REGION),sri_lanka)
