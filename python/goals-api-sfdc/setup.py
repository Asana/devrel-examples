from setuptools import setup, find_packages

with open("./README.md") as f:
    readme = f.read()

setup(
    # Metadata
    name="asana_goals",
    version="0.0.1",
    author="Alejandro Arevalo",
    author_email="alejandro.arevalo@oktana.com",
    description="A Python example project using the Asana Goals API.",
    long_description=readme,
    long_description_content_type='text/markdown',
    url="https://github.com/alan-at-asana/goals-api-sfdc",
    project_urls={
        "Bug Tracker": "https://github.com/alan-at-asana/goals-api-sfdc/issues",
    },
    classifiers=[
        "Programming Language :: Python :: 3.6",
        "Operating System :: OS Independent",
    ],
    # Options
    packages=find_packages("src"),
    package_dir={"": "src"},
    python_requires=">=3.6",
    install_requires=[
        "toml",
        "requests",
        "cryptography",
        "croniter",
    ]
)
