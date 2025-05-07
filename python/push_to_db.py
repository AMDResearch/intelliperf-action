################################################################################
# MIT License
# 
# Copyright (c) 2025 Advanced Micro Devices, Inc. All Rights Reserved.
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
################################################################################

import argparse
import json
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo
from pymongo import MongoClient


def get_collection(db_name, collection_name, user, password, host, port):
    """Establish a connection and return the specified collection."""
    uri = f"mongodb://{user}:{password}@{host}:{port}/?authSource=admin"
    client = MongoClient(uri)
    db = client[db_name]
    return db[collection_name]


def add_items(json_path, db_name, collection_name, user, password, host, port, tags=None):
    """
    Load items from a JSON file, append metadata (created_at, meta), and insert them into the MongoDB collection.
    """
    pt = ZoneInfo("America/Los_Angeles")

    with open(json_path, "r") as f:
        items = json.load(f)

    for item in items:
        item["created_at"] = datetime.now(pt)
        item["tags"] = tags if tags else []
        item["meta"] = {
            "source_file": json_path,
            "notes": "",
            "schema_version": 2,
        }

    collection = get_collection(db_name, collection_name, user, password, host, port)
    result = collection.insert_many(items)
    print(
        f"✅ Added {len(result.inserted_ids)} items to '{db_name}.{collection_name}'."
    )


def main():
    parser = argparse.ArgumentParser(
        description="Insert JSON items into MongoDB with PT timestamps."
    )

    parser.add_argument("--json", "-j", required=True, help="Path to the JSON file")
    parser.add_argument("--db_name", "-d", required=True, help="MongoDB database name")
    parser.add_argument(
        "--collection", "-c", required=True, help="MongoDB collection name"
    )
    parser.add_argument("--user", "-u", required=True, help="MongoDB username")
    parser.add_argument("--password", "-p", required=True, help="MongoDB password")
    parser.add_argument("--host", "-H", required=True, help="MongoDB host")
    parser.add_argument("--port", "-P", required=True, type=int, help="MongoDB port")
    parser.add_argument("--tags", "-t", help="Comma-separated list of tags to add to each entry")

    args = parser.parse_args()

    if not os.path.isfile(args.json):
        print(f"Error: File '{args.json}' does not exist.", file=sys.stderr)
        sys.exit(1)

    # Process tags if provided
    tags = args.tags.split(',') if args.tags else None
    if tags:
        tags = [tag.strip() for tag in tags]  # Remove whitespace from each tag

    add_items(
        json_path=args.json,
        db_name=args.db_name,
        collection_name=args.collection,
        user=args.user,
        password=args.password,
        host=args.host,
        port=args.port,
        tags=tags,
    )


if __name__ == "__main__":
    main()
