FROM python:3.6

WORKDIR /usr/src/app

# Source directories
COPY src src
COPY test test
# Required files for build and testing
COPY setup.cfg .
COPY setup.py .
COPY pyproject.toml .
COPY .coveragerc .
COPY tox.ini .
COPY README.md .
# Build wheel
RUN pip install --no-cache-dir --upgrade setuptools wheel
RUN python setup.py bdist_wheel

FROM python:3.6

WORKDIR /usr/src/app

COPY --from=0 /usr/src/app/dist/asana_goals-*.whl .
RUN pip install --no-cache-dir asana_goals-*.whl

COPY . .

CMD [ "python", "-m", "asana_goals", "--service" ]
