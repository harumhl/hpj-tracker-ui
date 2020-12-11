CREATE TABLE category (
    category CHARACTER VARYING(50) NOT NULL,
    PRIMARY KEY (category)
);

CREATE TABLE goal (
    category CHARACTER VARYING(50) NOT NULL,
    name CHARACTER VARYING(50) NOT NULL,
    archived BIT NOT NULL,
    goal_count INT NOT NULL,
    unit CHARACTER VARYING(10),
    detail CHARACTER VARYING(500),
    PRIMARY KEY (name),
    FOREIGN KEY (category) REFERENCES category(category)
);

CREATE TABLE entry (
    done_date date NOT NULL,
    category CHARACTER VARYING(50) NOT NULL,
    name CHARACTER VARYING(50) NOT NULL,
    count INT NOT NULL,
    goal_count INT NOT NULL,
    updated_ts DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (done_date, category, name),
    FOREIGN KEY (name) REFERENCES goal(name)
);
