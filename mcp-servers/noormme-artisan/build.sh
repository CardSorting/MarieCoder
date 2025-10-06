#!/bin/bash
echo "Cleaning noormme-artisan..."
rm -rf dist
echo "Building noormme-artisan..."
tsc
echo "noormme-artisan build complete."
